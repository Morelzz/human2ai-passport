// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Human2AI — Licenza d'uso (TRASFERIBILE, con royalty EIP-2981)
/// @notice Una licenza rappresenta il diritto d'uso di un volto in una categoria.
///         È trasferibile/cedibile e porta una royalty (EIP-2981): la persona
///         reale viene pagata a OGNI rivendita, anche fuori dalla piattaforma —
///         la royalty segue il contenuto ovunque.
/// @dev `identityTokenId` lega la licenza all'identità soulbound (HumanIdentity).
///      `contentCert` = certificato del contenuto generato (= filigrana invisibile),
///      così dall'immagine si risale a licenza, identità e proprietario.
contract HumanLicense is ERC721, ERC2981, Ownable {
    uint256 public nextId = 1;

    mapping(uint256 => uint256) public identityOf;  // licenza -> identità del volto
    mapping(uint256 => string) public categoryOf;   // licenza -> categoria d'uso
    mapping(uint256 => bytes32) public contentCert; // licenza -> certificato contenuto

    string private _base;

    constructor(address initialOwner, string memory baseURI_)
        ERC721("Human2AI License", "H2AI-LIC")
        Ownable(initialOwner)
    {
        _base = baseURI_;
    }

    /// Emette una licenza a `to`, con royalty (bps) verso `royaltyReceiver`
    /// (il wallet della persona reale). 10000 bps = 100%.
    function mintLicense(
        address to,
        uint256 identityTokenId,
        string calldata category,
        bytes32 contentCertHash,
        address royaltyReceiver,
        uint96 royaltyBps
    ) external onlyOwner returns (uint256 id) {
        id = nextId++;
        identityOf[id] = identityTokenId;
        categoryOf[id] = category;
        contentCert[id] = contentCertHash;
        _safeMint(to, id);
        _setTokenRoyalty(id, royaltyReceiver, royaltyBps); // la royalty segue il token
    }

    function _baseURI() internal view override returns (string memory) {
        return _base;
    }

    function setBaseURI(string calldata b) external onlyOwner {
        _base = b;
    }

    function supportsInterface(bytes4 id) public view override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(id);
    }
}
