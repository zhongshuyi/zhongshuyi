# Maintaining this profile

- Edit the root `README.md` to update the introduction, technology badges, and contact links.
- Keep the profile focused on personal interests and skills. Do not include current project updates or lists of individual repositories.
- The name, bio, and location beside the avatar are GitHub account settings, independent of this repository.
- The personal website is retired; do not restore its old links.
- The README keeps the original animated greeting and compact badge layout, with English sections and descriptions.

## Automatic visuals

[Update profile visuals](https://github.com/zhongshuyi/zhongshuyi/actions/workflows/contribution-snake.yml) runs daily at 02:17 UTC (10:17 Asia/Shanghai), and can also be started with **Run workflow**.

It generates light and dark versions of:

- GitHub statistics and top languages, using a pinned [GitHub Readme Stats Action](https://github.com/stats-organization/github-readme-stats-action) and core version.
- A contribution activity graph, using the last 90 UTC dates from GitHub's official contribution calendar.
- The contribution snake animation, using [snk](https://github.com/Platane/snk).

SVG files are published to `codex/profile-assets` and displayed from GitHub's raw file URLs. No personal website, extra service account, or personal access token is required. A failed generation keeps the previously published images; invalid or error cards prevent publication.

The generation job has read-only repository permissions. Only the separate publishing job can write, and it updates the asset branch with a normal commit and push. It does not force-push or write generated images to `main`. Commits use the repository owner's GitHub noreply identity, with no co-author trailers.

GitHub schedules may be delayed or disabled after a long period without repository activity. Re-enable the workflow and run it manually if needed. See [GitHub's schedule documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## External badges

Technology and social badges use [Shields](https://shields.io/). Profile views use [GitHub Profile Views Counter](https://github.com/antonkomarev/github-profile-views-counter); this counts image requests rather than unique visitors. The old counter's total has not been imported.

The original greeting uses Giphy, and the small dancing GIF is stored in this repository. If an external service changes, replace its image URL. Statistics, contribution graphs, and the snake are served from this repository instead of public rendering services.
