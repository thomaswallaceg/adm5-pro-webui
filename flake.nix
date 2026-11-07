{
  description = "Web UI for a FlashForge Adventurer 5M Pro";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forAllSystems (pkgs: {
        default = pkgs.callPackage ./nix/package.nix { };
      });

      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [ pkgs.nodejs_24 pkgs.pnpm_10 ];
        };
      });

      nixosModules.default = { config, lib, pkgs, ... }:
        let
          cfg = config.services.adm5-pro-webui;
        in
        {
          options.services.adm5-pro-webui = {
            enable = lib.mkEnableOption "the Adventurer 5M Pro web UI";

            package = lib.mkOption {
              type = lib.types.package;
              default = self.packages.${pkgs.stdenv.hostPlatform.system}.default;
              defaultText = lib.literalExpression "adm5-pro-webui flake's packages.default";
              description = "The adm5-pro-webui package to run.";
            };

            host = lib.mkOption {
              type = lib.types.str;
              default = "0.0.0.0";
              description = "Address the server listens on.";
            };

            port = lib.mkOption {
              type = lib.types.port;
              default = 8000;
              description = "Port the server listens on.";
            };

            openFirewall = lib.mkOption {
              type = lib.types.bool;
              default = false;
              description = ''
                Open the port in the firewall. The UI has no login, so anyone who can
                reach it can control the printer.
              '';
            };
          };

          config = lib.mkIf cfg.enable {
            systemd.services.adm5-pro-webui = {
              description = "Adventurer 5M Pro web UI";
              wantedBy = [ "multi-user.target" ];
              after = [ "network-online.target" ];
              wants = [ "network-online.target" ];

              environment = {
                HOST = cfg.host;
                PORT = toString cfg.port;
                DATA_DIR = "/var/lib/adm5-pro-webui";
              };

              serviceConfig = {
                # The server resolves dist/ relative to its working directory.
                WorkingDirectory = "${cfg.package}/share/adm5-pro-webui";
                ExecStart = "${cfg.package}/bin/adm5-pro-webui";
                DynamicUser = true;
                StateDirectory = "adm5-pro-webui";
                Restart = "on-failure";
                RestartSec = 5;

                NoNewPrivileges = true;
                PrivateTmp = true;
                ProtectSystem = "strict";
                ProtectHome = true;
                ProtectKernelTunables = true;
                ProtectControlGroups = true;
                RestrictAddressFamilies = [ "AF_INET" "AF_INET6" ];
              };
            };

            networking.firewall.allowedTCPPorts = lib.mkIf cfg.openFirewall [ cfg.port ];
          };
        };
    };
}
