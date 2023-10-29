# fabric-app-template

## Development setup

### Requirements
You need to install the following software before you start: 
- just: Install microfab and deploy cc
- docker: To run microfab
- @hyperledger-labs/weft: Manage Fabric Wallet
- jq
- Hyperledger Fabric binaries

Use the following script to check which of them you already have implemented: 

```@bash
./check.js
```

### Install fabric

You need to install and configure hyperledger binary dependencies: 
```@bash
$ just install-fabric
```

Then, set the following environment variables to point to fabric binaries:

```@bash
export WORKSHOP_PATH=$(pwd)
export PATH=${WORKSHOP_PATH}/bin:$PATH
export FABRIC_CFG_PATH=${WORKSHOP_PATH}/config
```


### Run local development Fabric network
```@bash
just microfab
```

### Contracts development 
To create channel and deploy first version of the chaincode to start development run:

```@bash
just debugcc
source $WORKSHOP_PATH/_cfg/uf/org1admin.env
```

Then, you can start the development of the chain code by executing: 

```@bash
cd contracts/asset-transfer-typescript
npm install 
npm run build
npm run start:server-debug
```