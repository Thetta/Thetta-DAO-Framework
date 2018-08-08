pragma solidity ^0.4.22;

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
}
