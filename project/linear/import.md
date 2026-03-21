I created the script here:

[upload_linear_backlog.py](sandbox:/mnt/data/upload_linear_backlog.py)

It uses Linear’s GraphQL API endpoint at `https://api.linear.app/graphql`, authenticates with your Linear API key in the `Authorization` header, and creates issues with the `issueCreate` mutation. Linear’s docs also note that issue creation is team-based, so the script resolves the target team before creating issues. ([Linear][1])

What it does:

* reads the markdown files from your backlog folder
* creates one Linear issue per markdown file
* uses the full markdown file as the issue description
* supports team key, team name, or team ID
* optionally applies an existing Linear project
* optionally applies existing Linear labels
* can write a JSON or CSV manifest of created issues

A typical run looks like this:

```bash
export LINEAR_API_KEY="your_linear_api_key"

python upload_linear_backlog.py \
  --folder /path/to/linear_backlog \
  --team-key ENG \
  --project "BIAN Service Request Portal" \
  --default-priority high \
  --apply-label backlog \
  --apply-label imported \
  --include-issue-key-in-title \
  --manifest-json linear_created.json \
  --manifest-csv linear_created.csv
```

A safe first pass is:

```bash
python upload_linear_backlog.py \
  --folder /path/to/linear_backlog \
  --team-key ENG \
  --dry-run
```

A few important notes:

* The script expects the labels you pass with `--apply-label` to already exist in Linear. Linear documents labels as workspace-level or team-level entities; this script resolves existing labels and fails clearly if they are missing. ([Linear][2])
* It does **not** create dependency links between issues. It preserves each ticket’s Dependencies section in the issue description, which is usually enough for an initial import.
* If you do not pass a project, the issues will still be created against the selected team.
* If you do not specify a state, Linear assigns the issue to the team’s default backlog or triage state on creation. ([Linear][1])

You’ll need Python 3 and the `requests` package:

```bash
pip install requests
```

If you want, I can next generate a second script that reads the manifest and creates **dependency links** between the imported issues.

[1]: https://linear.app/developers/graphql?utm_source=chatgpt.com "Getting started – Linear Developers"
[2]: https://linear.app/docs/labels?utm_source=chatgpt.com "Labels – Linear Docs"
