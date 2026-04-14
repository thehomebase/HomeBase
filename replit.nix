{pkgs}: {
  deps = [
    pkgs.ffmpeg-full
    pkgs.poppler_utils
    pkgs.lsof
    pkgs.netcat
    pkgs.postgresql
  ];
}
