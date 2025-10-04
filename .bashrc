
# DAY73-CLOUD Project Banner
if [ -f .project-banner ]; then
    cat .project-banner
    echo ""
fi

# Zobraz aktuální branch a status
if [ -d .git ]; then
    echo "📌 Git branch: $(git branch --show-current)"
    echo "📊 Status: $(git status -s | wc -l | tr -d ' ') changed files"
    echo ""
fi
