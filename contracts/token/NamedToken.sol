pragma solidity ^0.4.15;

contract NamedToken {
// Fields:
     string public name = "";
     string public symbol = "";
     uint8 public decimals = 18;        // WARNING: this is by default!

// Methods:
     function NamedToken(string _name, string _symbol, uint8 _decimals) {
          name = _name;
          symbol = _symbol;
          decimals = _decimals;
     }

     /**
      * @dev Function to calculate hash of the token`s name.
      * @dev Function needed because we can not just return name of the token to another contract - strings have variable length
      * @return Hash of the token`s name
      */
     function getNameHash() constant public returns (bytes32 result){
          return keccak256(name);
     }

     /**
      * @dev Function to calculate hash of the token`s symbol.
      * @dev Function needed because we can not just return symbol of the token to another contract - strings have variable length
      * @return Hash of the token`s symbol
      */
     function getSymbolHash() constant public returns (bytes32 result){
          return keccak256(symbol);
     }
}
