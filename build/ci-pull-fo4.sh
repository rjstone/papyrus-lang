#!/bin/bash

pushd ./ > /dev/null

mkdir papyrus/FO4Scripts
cd papyrus/FO4Scripts
git init
git pull https://$FO4_SCRIPTS_GITHUB_TOKEN@github.com/joelday/FO4Scripts.git
rm -rf .git

popd > /dev/null
