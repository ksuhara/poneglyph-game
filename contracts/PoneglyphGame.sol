pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PoneglyphGame is ERC721 {
    uint256 public constant NUM_PONEGLYPHS = 4;
    IERC20 public erc20Token;

    struct Poneglyph {
        uint256 originalId;
        bool isOriginal;
    }

    Poneglyph[] public poneglyphs;
    mapping(uint256 => uint256) public depositedAmount;
    mapping(address => uint256[]) private playerToTokenIds;
    // mapping(address => uint256) private lastActionTimestamp;
    // uint256 private constant COOLDOWN_PERIOD = 1 hours;


    event Victory(address indexed winner);

    constructor(address erc20TokenAddress) ERC721("PoneglyphGame", "PGG") {
        erc20Token = IERC20(erc20TokenAddress);
        for (uint256 i = 0; i < NUM_PONEGLYPHS; i++) {
            poneglyphs.push(Poneglyph(i, true));
            _mint(msg.sender, i);
        }
    }

    function deposit(uint256 tokenId, uint256 amount) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        erc20Token.transferFrom(msg.sender, address(this), amount);
        depositedAmount[tokenId] += amount;
    }

    function mintCopy(uint256 tokenId, uint256 amount) external {
        require(poneglyphs[tokenId].isOriginal, "Cannot mint copy from copy");
        require(erc20Token.balanceOf(msg.sender) >= amount, "Insufficient balance");
        address originalOwner = ownerOf(tokenId);
        uint256 winningChance = (amount * 150) / (amount + depositedAmount[tokenId]);
        uint256 randomNumber = randomness();
        if (randomNumber < winningChance) {
            erc20Token.transferFrom(msg.sender, address(this), amount);
            uint256 newTokenId = poneglyphs.length;
            poneglyphs.push(Poneglyph(poneglyphs[tokenId].originalId, false));
            _mint(msg.sender, newTokenId);
        } else {
            erc20Token.transferFrom(msg.sender, originalOwner, amount / 2);
        }
        
    }

    function challengeOriginal(uint256 originalId, uint256 amount) external {
        address originalOwner = ownerOf(originalId);
        checkIfAddressIsOriginalHolder();
        uint256 requiredAmount = amount;
        require(erc20Token.balanceOf(msg.sender) >= requiredAmount, "Insufficient balance");

        uint256 winningChance = (amount * 50) / (amount + depositedAmount[originalId]);
        uint256 randomNumber = randomness();
        if (randomNumber < winningChance) {
            erc20Token.transferFrom(msg.sender, address(this), amount);
            _transfer(originalOwner, msg.sender, originalId);
        } else {
            erc20Token.transferFrom(msg.sender, originalOwner, amount / 2);
        }
    }

    function findOriginalTokenId(uint256 originalId) internal view returns (uint256) {
        for(uint256 i = 0; i < poneglyphs.length; i++) {
            if (poneglyphs[i].isOriginal && poneglyphs[i].originalId == originalId) {
                return i;
            }
        }
        revert("Original not found");
    }

    function checkIfAddressIsOriginalHolder() internal view{
        for (uint256 i = 0; i < NUM_PONEGLYPHS; i++) {
            if ( ownerOf(i) == msg.sender) {
                revert("Already own original");
            }
        }
    }

    function checkVictory(address player) external {
        if (playerToTokenIds[player].length == NUM_PONEGLYPHS) {
            emit Victory(player);
        }
    }

    function randomness() internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % 100;
    }

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        super._transfer(from, to, tokenId);
        removeFromPlayerToTokenIds(from, tokenId);
        playerToTokenIds[to].push(tokenId);
    }

    function _mint(
        address to,
        uint256 tokenId
    ) internal override {
        super._mint(to, tokenId);
        playerToTokenIds[to].push(tokenId);
    }

    function removeFromPlayerToTokenIds(address player, uint256 tokenId) private {
        uint256[] storage tokenIds = playerToTokenIds[player];
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (tokenIds[i] == tokenId) {
                tokenIds[i] = tokenIds[tokenIds.length - 1];
                tokenIds.pop();
                break;
            }
        }
    }
}