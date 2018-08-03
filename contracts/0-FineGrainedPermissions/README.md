 # FineGrainedPermissions
 ---
 ## Description
This is an example of a more fine grained permissions.
DaoBase allows us to permit 'issueTokens'/'burnTokens' only for all tokens at once. 

So if you have 3 tokens (governance, rep, repdev) -> any member that can issueTokens 
for 1st, will be able to issueTokens for the 2nd, etc. 
 
Imagine you want:
1. create your own more fine grained permissions - issueTokensGovr, issueTokensRep, issueTokensRepDev
2. to permit issueTokensGovr to CEO
3. to permit issueTokensRep tnd issueTokensRepDev to Managers

This contract shows how to do that.