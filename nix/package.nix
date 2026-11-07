{ lib
, stdenv
, nodejs_24
, pnpm_10
, pnpmConfigHook
, fetchPnpmDeps
, makeWrapper
}:

let
  pnpm = pnpm_10;
  nodejs = nodejs_24;
  pkg = lib.importJSON ../package.json;
in
stdenv.mkDerivation (finalAttrs: {
  pname = pkg.name;
  inherit (pkg) version;

  src = lib.fileset.toSource {
    root = ../.;
    fileset = lib.fileset.unions [
      ../package.json
      ../pnpm-lock.yaml
      ../index.html
      ../svelte.config.js
      ../tsconfig.json
      ../tsconfig.server.json
      ../vite.config.ts
      ../src
      ../server
      ../shared
    ];
  };

  nativeBuildInputs = [ nodejs pnpm pnpmConfigHook makeWrapper ];

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    inherit pnpm;
    fetcherVersion = 2;
    # Replace with the real hash: build once and copy the "got:" value from the error.
    hash = lib.fakeHash;
  };

  buildPhase = ''
    runHook preBuild
    pnpm build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    app=$out/share/adm5-pro-webui
    mkdir -p $app $out/bin
    cp -r dist server shared package.json node_modules $app/

    # The server runs its TypeScript directly, so it needs a node with type stripping (>= 22.18).
    makeWrapper ${lib.getExe nodejs} $out/bin/adm5-pro-webui \
      --add-flags server/index.ts

    runHook postInstall
  '';

  meta = {
    description = "Web UI for a FlashForge Adventurer 5M Pro";
    mainProgram = "adm5-pro-webui";
    platforms = lib.platforms.linux;
  };
})
