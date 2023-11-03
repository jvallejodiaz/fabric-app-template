Feature: Transaction invocation
    Background:
        Given I have deployed a Fabric network
        And I have created and joined all channels
        And I deploy node chaincode named basic at version 1.0.0 for all organizations on channel mychannel with endorsement policy AND("Org1MSP.member","Org2MSP.member")
        And I create a gateway named mygateway for user User1 in MSP Org1MSP
        And I connect the gateway to peer0.org1.example.com
        And I use the mychannel network
        And I use the basic contract

    Scenario: Add new value
        When I prepare to evaluate an PutName transaction
        And I set the transaction arguments to ["dance", "conga"]
        And I invoke the transaction
        Then the response should be "conga"