#
# Copyright 2020 IBM All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

base_dir := $(patsubst %/,%,$(dir $(realpath $(lastword $(MAKEFILE_LIST)))))


node_dir := $(base_dir)/contracts/basic
scenario_dir := $(base_dir)/features

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

.PHONEY: clean-node
clean-node:
	rm -rf "$(node_dir)/package-lock.json" "$(node_dir)/node_modules"