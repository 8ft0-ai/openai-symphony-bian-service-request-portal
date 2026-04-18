# cd ~/sandbox/AI/openai/symphony/elixir

cd ~/dev/8ft0-ai/symphony/elixir



mise exec -- ./bin/symphony --port 4000 ~/dev/8ft0-ai/openai-symphony-bian-service-request-portal/WORKFLOW.md --i-understand-that-this-will-be-running-without-the-usual-guardrails

python tools/upload_linear_backlog.py --folder ./test --team-key EXR --project-id hello-world-57626686d7fa 
