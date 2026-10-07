# 个人主页维护

- 简介、精选项目和联系方式：修改根目录的 `README.md`。
- 头像旁的姓名、简介、所在地：属于 GitHub 账号资料，独立于此仓库。
- 个人站已停用，主页中的项目入口直接链接 GitHub 仓库。
- 顶部保留仓库原有动图；技术徽章使用 Shields，浏览量使用 GitHub Profile Views Counter。外部服务发生变化时可替换相应图片链接。

## 贡献图贪吃蛇

[Update contribution snake](https://github.com/zhongshuyi/zhongshuyi/actions/workflows/contribution-snake.yml) 每天 UTC 02:17（北京时间 10:17）生成浅色和深色两张 SVG，也可以在 Actions 页面手动运行。

生成文件发布到 `codex/profile-assets` 分支，README 通过 GitHub 的原始文件地址显示动画。无需部署个人站、注册额外服务或配置个人访问令牌。生成失败时保留已有动画。

工作流将生成与发布分成两个 job：第三方生成 Action 只有读取权限，发布 job 才能写入仓库。Actions 固定到已核实的 commit SHA；发布采用普通提交与推送，不强制覆盖远端历史，也不向 `main` 写入生成文件。

动画提交使用仓库所有者的 GitHub noreply 邮箱，不添加 `Co-Authored-By`。

GitHub 的定时任务可能延迟；公开仓库长时间没有活动时，定时任务也可能被自动停用。遇到这种情况，在 Actions 页面重新启用工作流并点击 **Run workflow**。[GitHub 定时任务说明](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

组件参考：[snk](https://github.com/Platane/snk)、[Shields](https://shields.io/)、[GitHub Profile Views Counter](https://github.com/antonkomarev/github-profile-views-counter)。
