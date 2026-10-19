#!/bin/sh
set -eu

build_version="${BUILD_VERSION:-$(date -u +%Y%m%d%H%M%S)}"
build_time="${BUILD_TIME:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
build_commit="${BUILD_COMMIT:-unknown}"

if [ "$build_commit" = "unknown" ] && command -v git >/dev/null 2>&1; then
	build_commit="$(git rev-parse --short HEAD 2>/dev/null || printf unknown)"
fi

tsc -b

VITE_BUILD_VERSION="$build_version" \
	VITE_BUILD_COMMIT="$build_commit" \
	VITE_BUILD_TIME="$build_time" \
	vite build
