// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// ERC-5192: Minimal Soulbound NFT (token bloccato, non trasferibile).
interface IERC5192 {
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);
    function locked(uint256 tokenId) external view returns (bool);
}

/// @title Human2AI — Identità del volto (SOULBOUND)
/// @notice Il "titolo di proprietà" del volto di una persona reale e verificata.
///         È SOULBOUND: non si può vendere né trasferire la propria identità.
///         Le licenze d'uso sono un contratto separato (HumanLicense), trasferibili.
/// @dev Mint riservato al `owner` (relayer della piattaforma) DOPO il KYC. Gas a
///      carico della piattaforma (mint gasless lato utente). `cert` = token_hash
///      del registro Human2AI, così on-chain e off-chain puntano allo stesso ID.
contract HumanIdentity is ERC721, Ownable, IERC5192 {
    uint256 public nextId = 1;

    mapping(uint256 => bytes32) public certHash;   // tokenId -> token_hash del registro
    mapping(uint256 => string) public handleOf;    // tokenId -> handle leggibile
    mapping(bytes32 => uint256) public tokenByCert; // token_hash -> tokenId (lookup)

    string private _base;

    constructor(address initialOwner, string memory baseURI_)
        ERC721("Human2AI Identity", "H2AI-ID")
        Ownable(initialOwner)
    {
        _base = baseURI_;
    }

    /// Emette l'identità soulbound a `to` (il wallet della persona, anche embedded).
    function mintIdentity(address to, bytes32 cert, string calldata handle_)
        external
        onlyOwner
        returns (uint256 id)
    {
        require(cert != bytes32(0), "cert vuoto");
        require(tokenByCert[cert] == 0, "cert gia' registrato");
        id = nextId++;
        certHash[id] = cert;
        handleOf[id] = handle_;
        tokenByCert[cert] = id;
        _safeMint(to, id);
        emit Locked(id); // soulbound dal mint
    }

    /// ERC-5192: l'identità è sempre vincolata.
    function locked(uint256 tokenId) external view override returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    /// La persona (o la piattaforma) può BRUCIARE la propria identità: revoca
    /// prospettica on-chain, coerente col diritto all'oblio. Non è una vendita.
    function burn(uint256 tokenId) external {
        require(_ownerOf(tokenId) == msg.sender || owner() == msg.sender, "non autorizzato");
        delete tokenByCert[certHash[tokenId]];
        _burn(tokenId);
    }

    /// Blocca i trasferimenti: consentiti solo mint (from==0) e burn (to==0).
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "Soulbound: non trasferibile");
        return super._update(to, tokenId, auth);
    }

    function _baseURI() internal view override returns (string memory) {
        return _base;
    }

    function setBaseURI(string calldata b) external onlyOwner {
        _base = b;
    }

    function supportsInterface(bytes4 id) public view override returns (bool) {
        return id == 0xb45a3c0e || super.supportsInterface(id); // ERC-5192
    }
}
