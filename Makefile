#
# Copyright 2020 IBM All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

base_dir := $(patsubst %/,%,$(dir $(realpath $(lastword $(MAKEFILE_LIST)))))


contracts_dir := $(base_dir)/contracts/basic
applications_dir := $(base_dir)/applications/basic_app
scenario_dir := $(base_dir)/features

# PEER_IMAGE_PULL is where to pull peer image from, it can be set by external env variable
# In fabric-gateway main branch it should reflect the location of the latest fabric main branch image
PEER_IMAGE_PULL ?= hyperledger-fabric.jfrog.io/fabric-peer:amd64-2.5-stable

# PEER_IMAGE_TAG is what to tag the pulled peer image as, it will also be used in docker-compose to reference the image
# In fabric-gateway main branch this version tag should correspond to the version in the forthcoming Fabric development
# branch.
export PEER_IMAGE_TAG ?= 2.5
export ORDERER_IMAGE_TAG ?= 2.5
export TOOLS_IMAGE_TAG ?= 2.5
export PEER_IMAGE_TAG ?= 2.5
export FABRIC_CA_IMAGE_TAG ?= 1.5
export DOCKER_DEBUG ?= info:dockercontroller,gateway=debug
export DOCKER_SOCK ?= /var/run/docker.sock
# TWO_DIGIT_VERSION specifies which chaincode images to pull, they will be tagged to be consistent with PEER_IMAGE_TAG
# In fabric-gateway main branch it should typically be the latest released chaincode version available in dockerhub.
TWO_DIGIT_VERSION ?= 2.5


TMPDIR ?= /tmp

.PHONEY: default
default:
	@echo 'No default target.'

.PHONEY: build
build: build-contracts

.PHONEY: build-contracts
build-contracts:
	cd "$(contracts_dir)" && \
		npm install && \
		npm run build

.PHONEY: build-apps
build-apps:
	cd "$(applications_dir)" && \
		npm install && \
		npm run build		

.PHONEY: unit-test-contracts
unit-test-contracts: build-contracts
	cd "$(contracts_dir)" && \
		npm test

.PHONEY: unit-test-apps
unit-test-apps: build-apps
	cd "$(applications_dir)" && \
		npm test		

.PHONEY: scenario-test-contracts
scenario-test-contracts: build-contracts
	cd "$(scenario_dir)/support" && \
		rm -rf package-lock.json node_modules && \
		npm install && \
		npm run test:contracts

.PHONEY: scenario-test-apps
scenario-test-apps: build-apps
	cd "$(scenario_dir)/support" && \
		rm -rf package-lock.json node_modules && \
		npm install && \
		npm run test:apps

.PHONEY: scenario-test
scenario-test: scenario-test-contracts scenario-test-apps

.PHONEY: pull-latest-peer
pull-latest-peer:
	docker pull $(PEER_IMAGE_PULL)
	docker tag $(PEER_IMAGE_PULL) hyperledger/fabric-peer:$(PEER_IMAGE_TAG)
	# also need to retag the following images for the chaincode builder
	for IMAGE in baseos ccenv javaenv nodeenv; do \
		docker pull hyperledger/fabric-$${IMAGE}:$(TWO_DIGIT_VERSION); \
		docker tag hyperledger/fabric-$${IMAGE}:$(TWO_DIGIT_VERSION) hyperledger/fabric-$${IMAGE}:$(PEER_IMAGE_TAG); \
	done

.PHONEY: build-app-container
build-app-container:
	cd "$(applications_dir)/.." && \
		docker-compose build

.PHONEY: clean-node
clean-node:
	rm -rf "$(contracts_dir)/package-lock.json" "$(contracts_dir)/node_modules"