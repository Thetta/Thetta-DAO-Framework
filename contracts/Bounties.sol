pragma solidity ^0.4.15;

// other methods are missing (we don't need that)
contract StdToken {
     function balanceOf(address _owner) public constant returns (uint256);
     function transfer(address _to, uint256 _value) returns(bool);
}

contract BountyItem {
// Fields:
     address public admin = 0x0;        // who does all dispute resolution
     address public creator = 0x0;      // who creates this BountyItem

     // if this is null -> then bounty is in ETH
     address public erc20tokenContract = 0x0;
     uint64 public timeToCancel = 0;
     string public project = "";
     string public desc = "";

     uint public totalClaims = 0;
     mapping (uint=>address) claims;
     mapping (uint=>string) claimsName;

     // internal variable
     address payTo = 0x0;

     enum Type {
          Unknown,
          EtherOnly,
          TokensOnly,
          EtherPlusTokens
     }

     enum State {
          Start,

          BountyReceived,

          // creator has confirmed bounty payout
          // (now we will wait for confirm by admin)
          BountyPayoutConfirmedByCreator,
          
          // Sent to worker in full (by admin)
          BountyPaid,

          // Time elapsed
          BountyReturned
     }

     // Use 'getCurrentState' method instead to access state outside of contract
     State state = State.Start;

// Access methods:
     function getBalances()public constant returns(uint,uint){
          uint ethBalance = this.balance;
          uint tokenBalance = 0;

          if(erc20tokenContract!=0){
               StdToken erc20 = StdToken(erc20tokenContract);
               tokenBalance = erc20.balanceOf(this);
          }
          return (ethBalance,tokenBalance);
     }

     function getCurrentState()public constant returns(State){
          if(state==State.Start){
               var (ethBalance, tokenBalance) = getBalances();
               if((0!=ethBalance) || (0!=tokenBalance)){
                    return State.BountyReceived;
               }
          }

          return state; 
     }

     function getCurrentType()public constant returns(Type){
          var (ethBalance, tokenBalance) = getBalances();
          if((0!=ethBalance) && (0!=tokenBalance)){
               return Type.EtherPlusTokens;
          }

          if(0!=ethBalance){
               return Type.EtherOnly;
          }

          if(0!=tokenBalance){
               return Type.TokensOnly;
          }
          return Type.Unknown;
     }

// Modifiers:
     modifier onlyCreator() { 
          require(msg.sender==creator); 
          _; 
     }

     modifier onlyAdmin() { 
          require(msg.sender==admin); 
          _; 
     }

// Methods:
     function BountyItem(
          address _admin,
          address _erc20tokenContract, 
          uint64 _daysUntilCancel,      // can be zero
          string _project, 
          string _desc) public 
     {
          admin = _admin;
          creator = msg.sender; 
          
          erc20tokenContract = _erc20tokenContract;
          timeToCancel = uint64(now) + (_daysUntilCancel * 1 days);
          project = _project;
          desc = _desc;
     }

     // If true -> the bounty is in ETH
     // If false-> the bounty is in tokens
     function isTypeEth()public constant returns(bool){
          return (erc20tokenContract==0x0);
     }

     // See USER_STORIES.md:
     // "Once tokens are received **the balance** of this item is automatically updated (in the DApp)".
     function getAmountOfTokensReceived()public constant returns(uint){
          // otherwise just get a balance of this contract
          require(isTypeEth()!=true); 

          StdToken erc20 = StdToken(erc20tokenContract);
          // bounty tokens should be sent to this contract
          return erc20.balanceOf(this);
     }

     // See USER_STORIES.md:
     // "Mike should enter his Ethereum wallet and his info where he wants to get funds".
     function claimBounty(string _name, address _to) public {
          // add to list of claims
          claimsName[totalClaims] = _name;
          claims[totalClaims] = _to;
          ++totalClaims;
     }
     function getClaimAddress(uint _index) public constant returns(address){
          require(_index<totalClaims);
          return claims[_index];
     }
     function getClaimName(uint _index) public returns(string){
          require(_index<totalClaims);
          return claimsName[_index];
     }

     function isInTheClaims(address _a) public constant returns(bool){
          for(uint i=0; i<totalClaims; ++i){
               if(claims[i]==_a){
                    return true;
               }
          }
          return false;
     }

     function getBountyData() public constant returns(string, string, uint,     State, Type, uint,     address, address, uint){        
          return  (project, desc, timeToCancel,       getCurrentState(), getCurrentType(), this.balance,     creator, erc20tokenContract, getAmountOfTokensReceived());
          // project        
          // desc           
          // timeToCancel   

          // getCurrentState
          // getCurrentType
          // getBalance  

          // creator 
          // erc20tokenContract
          // amountOfTokensReceived
     }
     

     // See USER_STORIES.md:
     // "Tony can get his money back once time is elapsed"
     function getBountyBack() public onlyCreator {
          // once confirmed -> there is no way back
          require(state!=State.BountyPayoutConfirmedByCreator);
          require(isTimeElapsed()==true);

          sendBountyTo(creator);
          state = State.BountyReturned;
     }

     // See USER_STORIES.md:
     // "Tony sees that Mike asked for the bounty and claimed it"
     function confirmPayout(address _to) public onlyCreator {
          require(isInTheClaims(_to)==true);
          payTo = _to;
          state = State.BountyPayoutConfirmedByCreator;
     }

// Admin:
     // See USER_STORIES.md:
     // "Admin clicks on **Pay** button. Ether/tokens is transferred to Mike in full".
     function payBounty()public onlyAdmin {
          require(state==State.BountyPayoutConfirmedByCreator);
          assert(payTo!=0x0);

          sendBountyTo(payTo);
          state = State.BountyPaid;
     }

     // See USER_STORIES.md:
     // "Admin checks the case and then has 2 options -> return money to Tony or return money to Mike".
     function resolveToCreator()public onlyAdmin {
          sendBountyTo(creator);
          state = State.BountyReturned;
     }

     // See USER_STORIES.md:
     // "Admin checks the case and then has 2 options -> return money to Tony or return money to Mike".
     function resolveTo(address _to) public onlyAdmin {
          // admin can send to any address at any time
          //require(isInTheClaims(_to)==true);
          //require(isTimeElapsed()==true);

          sendBountyTo(_to);
          state = State.BountyPaid;
     }

// Aux methods:
     function isTimeElapsed() public constant returns(bool){
          return(uint(now) >= timeToCancel);
     }

     function sendBountyTo(address _to) internal {
          if(isTypeEth()){
               // send Ether
               _to.transfer(this.balance);
          }else{
               // send tokens
               StdToken erc20 = StdToken(erc20tokenContract);
               uint balance = erc20.balanceOf(this);
               erc20.transfer(_to,balance);
          }
     }

     // The Fallback function (receives Ether)
     // can be called multiple times
     function() public payable {
          // only if type is ETH
          require(isTypeEth()==true);
          // only if sender is the one that created that item
          require(creator==msg.sender);
     }
}


contract Bounties {
// Fields:
     uint public totalBounties = 0;
     mapping (uint => address) bounties;

     mapping (address => mapping(uint => address)) bountiesPerUser;
     mapping (address => uint) bountiesCountPerUser;

// Methods:
     function getBountiesCount()constant returns(uint out){
          out = totalBounties;
          return;
     }

     function getBounty(uint _index) constant returns (address out){
          out = bounties[_index];  
          return;
     }

     function getBountiesCountPerUser(address _a)constant returns(uint out){
          out = bountiesCountPerUser[_a];
          return;
     }

     function getBountyPerUser(address _a, uint _index) constant returns (address out){
          out = bountiesPerUser[_a][_index];  
          return;
     }

     function createNewBounty(
          address _admin,
          address _erc20tokenContract, 
          uint64 _daysUntilCancel,      // can be zero
          string _project, 
          string _desc) public returns(address)
     {
          address out = new BountyItem(_admin,_erc20tokenContract,_daysUntilCancel,_project,_desc);

          uint currentCount = bountiesCountPerUser[msg.sender];
          bountiesPerUser[msg.sender][currentCount] = out;
          bountiesCountPerUser[msg.sender]++;

          bounties[totalBounties] = out; 
          ++totalBounties; 

          return out;
     }
}
