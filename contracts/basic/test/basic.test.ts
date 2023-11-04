import { expect } from "chai";
import { SinonStubbedInstance, createStubInstance, assert } from "sinon";
import { Context } from "fabric-contract-api";
import { ChaincodeStub } from "fabric-shim";
import { BasicContract } from "../src/basic";

type MockState = {
  [key: string]: Uint8Array;
};

class MockChaincodeStub extends ChaincodeStub {
  states: MockState = {};
}

describe("Test Basic smart contract ", () => {
  let ctx: Context;
  let chaincodeStub: SinonStubbedInstance<MockChaincodeStub>;
  let contract: BasicContract;

  beforeEach(() => {
    ctx = new Context();
    chaincodeStub = createStubInstance(MockChaincodeStub);
    ctx.stub = chaincodeStub;

    chaincodeStub.getState.callsFake(async (key: string) => {
      let ret: Uint8Array = new Uint8Array(0);
      if (chaincodeStub.states) {
        ret = chaincodeStub.states[key];
      }
      return Promise.resolve(ret);
    });

    chaincodeStub.putState.callsFake((key: string, value: Uint8Array) => {
      if (!chaincodeStub.states) {
        chaincodeStub.states = {};
      }
      chaincodeStub.states[key] = value;
      return Promise.resolve();
    });

    contract = new BasicContract();
  });

  describe("Call method in basic contract", () => {
    it("Call PutName method", async () => {
      const response = await contract.PutName(ctx, "Something", "value");
      assert.calledWith(chaincodeStub.putState, "Something", Buffer.from("value"));
      expect(response).to.equals("value");
    });

    it("Call GetName method", async () => {
      await contract.PutName(ctx, "Something", "value");
      const response = await contract.GetName(ctx, "Something");
      assert.calledWith(chaincodeStub.getState, "Something");
      expect(response).to.equals("value");
    });
  });
});
