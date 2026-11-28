# Fedora package for Sundrift. Build with ../build-rpm.sh <version>.
Name:           sundrift
Version:        %{?sundrift_version}%{!?sundrift_version:0.0.0}
Release:        1
Summary:        Find real travel deals from Ottawa and Toronto
License:        LicenseRef-Unspecified
URL:            https://github.com/Rabs9/Travel-Notification
Source0:        sundrift-%{version}.tar.gz
BuildArch:      noarch

# server.js needs Node 18+ (fetch, AbortSignal.timeout, async-iterable streams)
Requires:       nodejs >= 1:18
Requires:       /usr/bin/node
Requires:       xdg-utils
Requires:       hicolor-icon-theme

%description
Tell Sundrift what kind of trip you want and it checks travel sites for real
prices (Transat, Sunwing, Air Transat, Flair, Carnival) and shows the best
matches with a link to book. It runs on your own computer: a small Node.js
server serves the app to your web browser on http://127.0.0.1:8765/ and stops
by itself about half an hour after the page is closed.

%prep
%setup -q

%build

%install
install -Dm644 index.html %{buildroot}%{_datadir}/sundrift/index.html
install -Dm644 server.js  %{buildroot}%{_datadir}/sundrift/server.js
install -Dm755 linux/sundrift %{buildroot}%{_bindir}/sundrift
install -Dm644 linux/io.github.rabs9.sundrift.desktop %{buildroot}%{_datadir}/applications/io.github.rabs9.sundrift.desktop
install -Dm644 linux/io.github.rabs9.sundrift.metainfo.xml %{buildroot}%{_metainfodir}/io.github.rabs9.sundrift.metainfo.xml
for s in 48 64 128 256 512; do
  install -Dm644 linux/icons/sundrift-$s.png %{buildroot}%{_datadir}/icons/hicolor/${s}x${s}/apps/io.github.rabs9.sundrift.png
done

%files
%{_bindir}/sundrift
%{_datadir}/sundrift/
%{_datadir}/applications/io.github.rabs9.sundrift.desktop
%{_metainfodir}/io.github.rabs9.sundrift.metainfo.xml
%{_datadir}/icons/hicolor/*/apps/io.github.rabs9.sundrift.png
