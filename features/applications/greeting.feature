Feature: Transaction invocation
    Background:
        Given I have deployed an Application on a Fabric network
        And I have created and joined all channels
        And I deploy node chaincode named basic at version 1.0.0 for all organizations on channel mychannel with endorsement policy AND("Org1MSP.member","Org2MSP.member")

    Scenario: Update Name
        When I prepare a call to localhost:3000 
        And I request Put to "/names/dance" with value "Conga"
        Then the API response should be "Conga"
    Scenario: Get Name
        When I prepare a call to localhost:3000 
        And I request Get to "/names/dance"
        Then the API response should be "Conga"        