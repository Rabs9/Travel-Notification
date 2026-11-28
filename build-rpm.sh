#!/usr/bin/env bash
# Build dist/Sundrift-Fedora.rpm (noarch). Needs rpmbuild (Fedora: dnf install rpm-build).
#   ./build-rpm.sh 1.2.0
set -euo pipefail
cd "$(dirname "$0")"
VER="${1:?usage: ./build-rpm.sh <version, e.g. 1.2.0>}"
VER="${VER#v}"
TOP="$PWD/build/rpm"
rm -rf "$TOP"; mkdir -p "$TOP"/{SOURCES,BUILD,RPMS,SRPMS} dist
# keep the release notes' version in step with the package
sed -i -E "s|<release version=\"[^\"]*\" date=\"[^\"]*\"/>|<release version=\"$VER\" date=\"$(date -u +%F)\"/>|" linux/io.github.rabs9.sundrift.metainfo.xml
tar --transform "s,^,sundrift-$VER/," -czf "$TOP/SOURCES/sundrift-$VER.tar.gz" index.html server.js linux
rpmbuild -bb --define "_topdir $TOP" --define "source_date_epoch_from_changelog 0" --define "sundrift_version $VER" linux/sundrift.spec
cp "$TOP"/RPMS/noarch/sundrift-"$VER"-1.noarch.rpm dist/Sundrift-Fedora.rpm
( cd dist && sha256sum Sundrift-Fedora.rpm > Sundrift-Fedora.rpm.sha256 )
ls -la dist/Sundrift-Fedora.rpm
