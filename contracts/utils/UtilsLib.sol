pragma solidity ^0.4.22;
import "../IDaoObserver.sol";
import "../governance/IProposal.sol";

library UtilsLib {
	function bytes32ToString(bytes32 x) internal pure returns (string) {
		bytes memory bytesString = new bytes(32);
		uint charCount = 0;
		for (uint j = 0; j < 32; j++) {
			byte char = byte(bytes32(uint(x) * 2 ** (8 * j)));
			if (char != 0) {
				bytesString[charCount] = char;
				charCount++;
			}
		}
		bytes memory bytesStringTrimmed = new bytes(charCount);
		for (j = 0; j < charCount; j++) {
			bytesStringTrimmed[j] = bytesString[j];
		}
		return string(bytesStringTrimmed);
	}
	
	function sqrt(uint x) public pure returns (uint y){
		uint z = (x + 1) / 2;
		y = x;
		while (z < y){
			y = z;
			z = (x / z + z) / 2;
		}
	}	

	function stringToBytes32(string memory source) returns (bytes32 result) {
		bytes memory tempEmptyStringTest = bytes(source);
		if (tempEmptyStringTest.length == 0) {
			return 0x0;
		}

		assembly {
			result := mload(add(source, 32))
		}
	}

	function isAddressInArray(address[] storage _addressArray, address _targetAddress) public view returns(bool) {
		// address[] memory parts = _addressArray;
		address item = _targetAddress;
		bool isInArray = false;
		for(uint j=0; j<_addressArray.length; ++j) {
			if(_addressArray[j]==item) {
				isInArray = true;
			}
		}
		return isInArray;
	}

	function isBytes32InArray(bytes32[] storage _bytes32Array, bytes32 _targetBytes32) public view returns(bool) {
		// bytes32[] memory _bytes32Array = _bytes32Array;
		bytes32 item = _targetBytes32;
		bool isInArray = false;
		for(uint j=0; j<_bytes32Array.length; ++j) {
			if(_bytes32Array[j]==item) {
				isInArray = true;
			}
		}
		return isInArray;
	}

	function removeBytes32FromArray(bytes32[] storage _bytes32Array, bytes32 _targetBytes32) public  {
		// bytes32[] memory _bytes32Array = _bytes32Array;
		bytes32 item = _targetBytes32;
		uint index = _bytes32Array.length;
		for(uint j=0; j<_bytes32Array.length; ++j) {
			if(_bytes32Array[j]==item) {
				index = j;
			}
		}
		require(index<_bytes32Array.length); // if member is not found -> exception
		if(index!=(_bytes32Array.length - 1)) { 
			_bytes32Array[index] = _bytes32Array[_bytes32Array.length-1];
		}
		delete _bytes32Array[_bytes32Array.length-1]; // delete last element
		_bytes32Array.length--;
		// return _bytes32Array;
	}

	function removeAddressFromArray(address[] storage _addressArray, address _targetAddress) public {
		// address[] memory parts = _addressArray;
		address item = _targetAddress;
		uint index = _addressArray.length;
		for(uint j=0; j<_addressArray.length; ++j) {
			if(_addressArray[j]==item) {
				index = j;
			}
		}
		require(index<_addressArray.length); // if member is not found -> exception
		if(index!=(_addressArray.length - 1)) { 
			_addressArray[index] = _addressArray[_addressArray.length-1];
		}
		delete _addressArray[_addressArray.length-1]; // delete last element
		_addressArray.length--;
		// return _addressArray;
	}

	function removeProposalFromArray(IProposal[] storage _proposalsArray, IProposal _targetProposal) public {
		// IProposal[] memory _proposalsArray = _proposalsArray;
		IProposal item = _targetProposal;
		uint index = _proposalsArray.length;
		for(uint j=0; j<_proposalsArray.length; ++j) {
			if(_proposalsArray[j]==item) {
				index = j;
			}
		}
		require(index<_proposalsArray.length); // if member is not found -> exception
		if(index!=(_proposalsArray.length - 1)) { 
			_proposalsArray[index] = _proposalsArray[_proposalsArray.length-1];
		}
		delete _proposalsArray[_proposalsArray.length-1]; // delete last element
		_proposalsArray.length--;
		// return _proposalsArray;
	}

	function removeDaoObserverFromArray(IDaoObserver[] storage _daoObserversArray, IDaoObserver _targetDaoObserver) public {
		// IDaoObserver[] memory _daoObserversArray = _daoObserversArray;
		IDaoObserver item = _targetDaoObserver;
		uint index = _daoObserversArray.length;
		for(uint j=0; j<_daoObserversArray.length; ++j) {
			if(_daoObserversArray[j]==item) {
				index = j;
			}
		}
		require(index<_daoObserversArray.length); // if member is not found -> exception
		if(index!=(_daoObserversArray.length - 1)) { 
			_daoObserversArray[index] = _daoObserversArray[_daoObserversArray.length-1];
		}
		delete _daoObserversArray[_daoObserversArray.length-1]; // delete last element
		_daoObserversArray.length--;
	}
}
