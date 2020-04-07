FROM snapcore/snapcraft

RUN apt -qq update
RUN apt -qq install --yes curl gnupg software-properties-common python-software-properties

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

# ensure we are running a recent version of Git
RUN add-apt-repository ppa:git-core/ppa

# add custom tools required for electron-builder
RUN apt -qq update
RUN apt -qq install --quiet --yes \
  nodejs \
  yarn \
  # needed for pacman builds
  bsdtar \
  # needed for RPM builds
  rpm \
  # needed for deb builds using fpm
  binutils \
  # needed for tweaking Snap output post-packaging
  squashfs-tools \
  build-essential \
  pkg-config \
  clang \
  python \
  # required to compile keytar
  libsecret-1-dev \
  # essential for testing Electron in a headless fashion
  # https://github.com/electron/electron/blob/master/docs/tutorial/testing-on-headless-ci.md
  libgtk-3-0 \
  libxtst6 \
  libxss1 \
  libgconf-2-4 \
  libasound2 \
  unzip \
  xvfb

COPY . .

ENTRYPOINT ["/build-and-package.sh"]
