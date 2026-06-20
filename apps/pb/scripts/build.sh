#!/bin/sh
set -eu

build_version="${BUILD_VERSION:-$(date -u +%Y%m%d%H%M%S)}"
build_time="${BUILD_TIME:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
build_commit="${BUILD_COMMIT:-unknown}"

if [ "$build_commit" = "unknown" ] && command -v git >/dev/null 2>&1; then
	build_commit="$(git rev-parse --short HEAD 2>/dev/null || printf unknown)"
fi

go build \
	-ldflags "-X main.buildVersion=${build_version} -X main.buildCommit=${build_commit} -X main.buildTime=${build_time}" \
	-o precious-petals-crm .
