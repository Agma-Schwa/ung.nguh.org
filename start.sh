#!/usr/bin/env bash

set -eu

pushd ..
git pull && git submodule update
popd

/srv/symlinks/bun --bun next build --turbopack
/srv/symlinks/bun --bun next start -p 24051