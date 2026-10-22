# Bundle size

Shows where the UI's JavaScript comes from: builds `flow-space-ui` with source maps into a temporary folder and sums
the minified bytes of the chunks by package (DevExtreme split by folder: `grids` = DataGrid, `viz` = Chart, `ui` =
the other widgets) and by app folder. By default only the chunks `index.html` loads at start count, which is what a
user downloads at sign-in; lazy chunks (map, help, diagram, Параметры form) are listed with `--all`.

Compare the **total of all start chunks** before and after a change, never one chunk: moving code between chunks
changes a chunk's size without changing the download.

```bash
export PATH=~/.nvm/versions/node/v24.21.0/bin:$PATH   # the UI builds with Node 24
node bundle-size.mjs                  # start chunks of the working tree
node bundle-size.mjs --all            # every chunk
node bundle-size.mjs --depth 4        # devextreme by one more folder level
node bundle-size.mjs --dist <dir>     # an existing build made with `vite build --sourcemap`
```

For a before/after comparison of an older commit, build it in a temporary `git worktree` and pass `--dist`.
