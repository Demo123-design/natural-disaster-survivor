// Build settings.
//
// `base: './'` makes the built page reference its JavaScript with a relative
// path. Without it the bundle is requested from the root of the domain,
// which works on a site of its own and breaks anywhere the game is served
// from a sub-path — which is most places it might be hosted.

export default {
  base: './',
  build: {
    outDir: 'dist',
    // One file rather than a handful. The game is small enough that a single
    // bundle is simpler to host, and it keeps publishing to one page plus
    // one script.
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        entryFileNames: 'game.js',
        chunkFileNames: 'game-[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
};
