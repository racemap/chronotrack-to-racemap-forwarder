import esbuild from "esbuild";
esbuild.buildSync({
  nodePaths: ["./node_modules"],
  platform: "node",
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["net", "fs"],
  outfile: ".build/forwarer.js",
});
