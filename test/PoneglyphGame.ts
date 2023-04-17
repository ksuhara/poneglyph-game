import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoneglyphGame", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployFixture() {
    let poneglyphGame,
      erc20,
      owner,
      shirohige,
      bigmom,
      kaido,
      shanks,
      luffy,
      kurohige;

    const ERC20 = await ethers.getContractFactory("MockERC20");
    erc20 = await ERC20.deploy("TestToken", "TT");
    await erc20.deployed();

    const PoneglyphGame = await ethers.getContractFactory("PoneglyphGame");
    poneglyphGame = await PoneglyphGame.deploy(erc20.address);
    await poneglyphGame.deployed();

    [owner, shirohige, bigmom, kaido, shanks, luffy, kurohige] =
      await ethers.getSigners();
    await erc20.mint(owner.address, ethers.utils.parseEther("100"));
    await erc20.mint(shirohige.address, ethers.utils.parseEther("100"));
    await erc20.mint(bigmom.address, ethers.utils.parseEther("100"));
    await erc20.mint(kaido.address, ethers.utils.parseEther("100"));
    await erc20.mint(shanks.address, ethers.utils.parseEther("100"));
    await erc20.mint(luffy.address, ethers.utils.parseEther("100"));
    await erc20.mint(kurohige.address, ethers.utils.parseEther("100"));

    await poneglyphGame.transferFrom(owner.address, shirohige.address, 0);
    await poneglyphGame.transferFrom(owner.address, bigmom.address, 1);
    await poneglyphGame.transferFrom(owner.address, kaido.address, 2);
    await poneglyphGame.transferFrom(owner.address, shanks.address, 3);

    return {
      poneglyphGame,
      erc20,
      owner,
      shirohige,
      bigmom,
      kaido,
      shanks,
      luffy,
      kurohige,
    };
  }

  describe("Deployment", function () {
    it("Should deploy contract and mint Poneglyphs to owner", async function () {
      const { owner, poneglyphGame } = await loadFixture(deployFixture);

      const balance = await poneglyphGame.balanceOf(owner.address);
      expect(balance).to.equal(0);
    });
  });

  describe("Game Logic", function () {
    it("Should allow deposit on original Poneglyph", async function () {
      const { erc20, shirohige, poneglyphGame } = await loadFixture(
        deployFixture
      );

      await erc20
        .connect(shirohige)
        .approve(poneglyphGame.address, ethers.utils.parseEther("5"));
      await poneglyphGame
        .connect(shirohige)
        .deposit(0, ethers.utils.parseEther("5"));
      const depositAmount = await poneglyphGame.depositedAmount(0);
      expect(depositAmount).to.equal(ethers.utils.parseEther("5"));
    });

    it("Should mint copy of Poneglyph", async function () {
      const { erc20, luffy, poneglyphGame } = await loadFixture(deployFixture);

      await erc20
        .connect(luffy)
        .approve(poneglyphGame.address, ethers.utils.parseEther("2.5"));
      await poneglyphGame
        .connect(luffy)
        .mintCopy(0, ethers.utils.parseEther("2.5"));
      const balance = await poneglyphGame.balanceOf(luffy.address);
      expect(balance).to.equal(1);
    });

    it("Should not mint copy from a copy", async function () {
      const { erc20, luffy, poneglyphGame } = await loadFixture(deployFixture);

      await erc20
        .connect(luffy)
        .approve(poneglyphGame.address, ethers.utils.parseEther("100"));
      await poneglyphGame
        .connect(luffy)
        .mintCopy(0, ethers.utils.parseEther("7.5"));
      await poneglyphGame
        .connect(luffy)
        .deposit(4, ethers.utils.parseEther("5"));
      await expect(
        poneglyphGame.connect(luffy).mintCopy(4, ethers.utils.parseEther("5"))
      ).to.be.revertedWith("Cannot mint copy from copy");
    });

    it("Should challenge original Poneglyph and transfer ownership", async function () {
      const { erc20, bigmom, luffy, poneglyphGame } = await loadFixture(
        deployFixture
      );

      await erc20
        .connect(bigmom)
        .approve(poneglyphGame.address, ethers.utils.parseEther("5"));
      await poneglyphGame
        .connect(bigmom)
        .deposit(1, ethers.utils.parseEther("5"));

      await erc20
        .connect(luffy)
        .approve(poneglyphGame.address, ethers.utils.parseEther("10"));
      await poneglyphGame
        .connect(luffy)
        .challengeOriginal(1, ethers.utils.parseEther("10"));

      const newOwner = await poneglyphGame.ownerOf(1);

      console.log(newOwner, "newOwner");
      console.log(luffy.address, "luffy.address");
      expect(newOwner).to.be.oneOf([bigmom.address, luffy.address]);
    });

    it("Should not challenge if already hold an original", async function () {
      const { erc20, bigmom, kaido, poneglyphGame } = await loadFixture(
        deployFixture
      );
      await erc20
        .connect(bigmom)
        .approve(poneglyphGame.address, ethers.utils.parseEther("15"));
      await poneglyphGame
        .connect(bigmom)
        .deposit(1, ethers.utils.parseEther("5"));

      await erc20
        .connect(kaido)
        .approve(poneglyphGame.address, ethers.utils.parseEther("15"));
      await expect(
        poneglyphGame
          .connect(kaido)
          .challengeOriginal(1, ethers.utils.parseEther("10"))
      ).to.be.revertedWith("Already own original");
    });

    it("Should emit Victory event when user has 1 original and 3 copies", async function () {
      const { erc20, shanks, shirohige, bigmom, kaido, luffy, poneglyphGame } =
        await loadFixture(deployFixture);

      await erc20
        .connect(bigmom)
        .approve(poneglyphGame.address, ethers.utils.parseEther("3"));
      await poneglyphGame
        .connect(bigmom)
        .deposit(1, ethers.utils.parseEther("3"));

      await erc20
        .connect(luffy)
        .approve(poneglyphGame.address, ethers.utils.parseEther("100"));
      await poneglyphGame
        .connect(luffy)
        .challengeOriginal(1, ethers.utils.parseEther("1"));

      const newOwner = await poneglyphGame.ownerOf(1);

      console.log(newOwner, "newOwner");
      console.log(luffy.address, "luffy.address");

      await erc20
        .connect(kaido)
        .approve(poneglyphGame.address, ethers.utils.parseEther("100"));
      await poneglyphGame
        .connect(kaido)
        .deposit(2, ethers.utils.parseEther("5"));
      await poneglyphGame
        .connect(luffy)
        .mintCopy(2, ethers.utils.parseEther("5"));
      console.log("mint copy of kaido");

      await erc20
        .connect(shanks)
        .approve(poneglyphGame.address, ethers.utils.parseEther("100"));
      await poneglyphGame
        .connect(shanks)
        .deposit(3, ethers.utils.parseEther("0.005"));
      await poneglyphGame
        .connect(luffy)
        .mintCopy(3, ethers.utils.parseEther("5"));
      console.log("mint copy of shanks");

      await erc20
        .connect(shirohige)
        .approve(poneglyphGame.address, ethers.utils.parseEther("100"));
      await poneglyphGame
        .connect(shirohige)
        .deposit(0, ethers.utils.parseEther("5"));
      console.log("mint copy of shirohige");

      await poneglyphGame
        .connect(luffy)
        .mintCopy(0, ethers.utils.parseEther("5"));
      await expect(poneglyphGame.connect(luffy).checkVictory(luffy.address))
        .to.emit(poneglyphGame, "Victory")
        .withArgs(luffy.address);
    });
  });
});
