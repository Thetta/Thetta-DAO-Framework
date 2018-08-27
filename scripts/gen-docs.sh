
cd ..
mv docs-examples-from-docusaurus docs  
cd docs 
mkdir docs
cd .. 
mv ./website ./docs
cd docs 
rm -r doc1.md 
rm -r doc2.md  
rm -r doc3.md
rm -r exampledoc4.md 
rm -r exampledoc5.md
cd ..
cd scripts
SOLC_ARGS=$1 solidity-docgen ../ ../contracts ../docs