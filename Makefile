#
# Copyright 2020 IBM All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

base_dir := $(patsubst %/,%,$(dir $(realpath $(lastword $(MAKEFILE_LIST)))))


node_dir := $(base_dir)/contracts/basic
scenario_dir := $(base_dir)/features

# PEER_IMAGE_PULL is where to pull peer image from, it can be set by external env variable
# In fabric-gateway main branch it should reflect the location of the latest fabric main branch image
PEER_IMAGE_PULL ?= hyperledger-fabric.jfrog.io/fabric-peer:amd64-2.5-stable

# PEER_IMAGE_TAG is what to tag the pulled peer image as, it will also be used in docker-compose to reference the image
# In fabric-gateway main branch this version tag should correspond to the version in the forthcoming Fabric development
# branch.
export PEER_IMAGE_TAG ?= 2.5

# TWO_DIGIT_VERSION specifies which chaincode images to pull, they will be tagged to be consistent with PEER_IMAGE_TAG
# In fabric-gateway main branch it should typically be the latest released chaincode version available in dockerhub.
TWO_DIGIT_VERSION ?= 2.5

TMPDIR ?= /tmp

.PHONEY: default
default:
	@echo 'No default target.'

.PHONEY: build
build: build-node

.PHONEY: build-node
build-node:
	cd "$(node_dir)" && \
		npm install && \
		npm run build

.PHONEY: unit-test-node
unit-test-node: build-node
	cd "$(node_dir)" && \
		npm test

.PHONEY: scenario-test-node
scenario-test-node: build-node
	cd "$(scenario_dir)/support" && \
		rm -rf package-lock.json node_modules && \
		npm install && \
		npm test

.PHONEY: scenario-test
scenario-test: scenario-test-node 

.PHONEY: pull-latest-peer
pull-latest-peer:
	docker pull $(PEER_IMAGE_PULL)
	docker tag $(PEER_IMAGE_PULL) hyperledger/fabric-peer:$(PEER_IMAGE_TAG)
	# also need to retag the following images for the chaincode builder
	for IMAGE in baseos ccenv javaenv nodeenv; do \
		docker pull hyperledger/fabric-$${IMAGE}:$(TWO_DIGIT_VERSION); \
		docker tag hyperledger/fabric-$${IMAGE}:$(TWO_DIGIT_VERSION) hyperledger/fabric-$${IMAGE}:$(PEER_IMAGE_TAG); \
	done

.PHONEY: clean-node
clean-node:
	rm -rf "$(node_dir)/package-lock.json" "$(node_dir)/node_modules"