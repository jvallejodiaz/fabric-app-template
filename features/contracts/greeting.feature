Feature: Transaction invocation
    Background:
        Given I create a gateway named mygateway for user admin in MSP org1
        And I connect the gateway to peer0.org1.example.com
        And I use the mychannel network
        And I use the asset-transfer contract

    Scenario: Evaluate with result
        When I prepare to evaluate an Echo transaction
        And I set the transaction arguments to ["conga"]
        And I invoke the transaction
        Then the response should be "conga"