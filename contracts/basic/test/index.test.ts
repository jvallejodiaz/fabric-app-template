import { expect } from "chai";
import { Contract } from "fabric-contract-api";
import { contracts, BasicContract } from "../src/index";

describe("Test index ", () => {
  it("should have BasicContract in contracts list", () => {
    expect(contracts).to.have.lengthOf(1);
  });

  it("should have export BasicContract as fabric contract", () => {
    const contract = new BasicContract();
    expect(contract).to.be.an.instanceOf(Contract);
  });
});
