const fs = require('fs').promises;
const path = require('path');
const simpleGit = require('simple-git');

/**
 * 変更履歴（CHANGELOG）を自動生成するスクリプト
 */

/**
 * Gitリポジトリを初期化
 */
function initGit() {
  return simpleGit({
    baseDir: path.join(__dirname, '..'),
    binary: 'git',
    maxConcurrentProcesses: 6,
  });
}

/**
 * コミットメッセージを分類
 * @param {Array} commits コミット配列
 * @returns {Object} 分類されたコミット
 */
function categorizeCommits(commits) {
  const categories = {
    features: [],
    fixes: [],
    docs: [],
    style: [],
    refactor: [],
    test: [],
    chore: [],
    breaking: [],
    other: []
  };

  commits.forEach(commit => {
    const message = commit.message.toLowerCase().trim();
    const isBreaking = message.includes('breaking change') || 
                      message.includes('breaking:') ||
                      message.includes('!:');

    if (isBreaking) {
      categories.breaking.push(commit);
    } else if (message.startsWith('feat:') || message.startsWith('feature:')) {
      categories.features.push(commit);
    } else if (message.startsWith('fix:') || message.startsWith('bugfix:')) {
      categories.fixes.push(commit);
    } else if (message.startsWith('docs:') || message.startsWith('doc:')) {
      categories.docs.push(commit);
    } else if (message.startsWith('style:')) {
      categories.style.push(commit);
    } else if (message.startsWith('refactor:')) {
      categories.refactor.push(commit);
    } else if (message.startsWith('test:')) {
      categories.test.push(commit);
    } else if (message.startsWith('chore:')) {
      categories.chore.push(commit);
    } else {
      categories.other.push(commit);
    }
  });

  return categories;
}

/**
 * コミットメッセージを整形
 * @param {Object} commit コミットオブジェクト
 * @returns {string} 整形されたメッセージ
 */
function formatCommitMessage(commit) {
  let message = commit.message.split('\n')[0]; // 最初の行のみ
  
  // プレフィックスを除去
  message = message.replace(/^(feat|fix|docs|style|refactor|test|chore|feature|bugfix|doc):\s*/i, '');
  
  // 最初の文字を大文字に
  message = message.charAt(0).toUpperCase() + message.slice(1);
  
  // ハッシュを追加
  const shortHash = commit.hash.substring(0, 7);
  
  return `${message} ([${shortHash}](../../commit/${commit.hash}))`;
}

/**
 * 日付範囲内のコミットを取得
 * @param {string} since 開始日
 * @param {string} until 終了日
 * @returns {Array} コミット配列
 */
async function getCommitsByDateRange(since, until) {
  try {
    const git = initGit();
    
    const options = {
      format: {
        hash: '%H',
        date: '%ai',
        message: '%s',
        author_name: '%aN',
        author_email: '%ae'
      }
    };
    
    if (since && until) {
      options.since = since;
      options.until = until;
    }
    
    const log = await git.log(options);
    return log.all;
    
  } catch (error) {
    console.error('❌ コミット履歴の取得に失敗しました:', error);
    return [];
  }
}

/**
 * 最新のタグを取得
 */
async function getLatestTag() {
  try {
    const git = initGit();
    const tags = await git.tags();
    
    if (tags.latest) {
      return tags.latest;
    }
    
    // タグがない場合は最初のコミットから
    const log = await git.log();
    if (log.all.length > 0) {
      return log.all[log.all.length - 1].hash;
    }
    
    return null;
    
  } catch (error) {
    console.warn('⚠️ タグの取得に失敗しました:', error.message);
    return null;
  }
}

/**
 * 前回のリリースからの変更を取得
 */
async function getChangesSinceLastRelease() {
  try {
    const git = initGit();
    const latestTag = await getLatestTag();
    
    let commits;
    if (latestTag) {
      // 最新タグから現在までの変更
      const log = await git.log(['HEAD', `^${latestTag}`]);
      commits = log.all;
    } else {
      // タグがない場合は全履歴
      const log = await git.log();
      commits = log.all;
    }
    
    return commits;
    
  } catch (error) {
    console.error('❌ 変更履歴の取得に失敗しました:', error);
    return [];
  }
}

/**
 * package.jsonからバージョン情報を取得
 */
async function getVersionFromPackage() {
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    return packageJson.version || '1.0.0';
  } catch (error) {
    console.warn('⚠️ package.jsonからのバージョン取得に失敗:', error.message);
    return '1.0.0';
  }
}

/**
 * 既存のCHANGELOG.mdを読み込み
 */
async function readExistingChangelog() {
  try {
    const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
    const content = await fs.readFile(changelogPath, 'utf8');
    return content;
  } catch (error) {
    // ファイルが存在しない場合
    return '';
  }
}

/**
 * CHANGELOGを生成
 */
async function generateChangelog() {
  try {
    console.log('📝 変更履歴の生成を開始します...');
    
    const commits = await getChangesSinceLastRelease();
    if (commits.length === 0) {
      console.log('📝 新しい変更がありません。');
      return;
    }
    
    const version = await getVersionFromPackage();
    const today = new Date().toISOString().split('T')[0];
    const categories = categorizeCommits(commits);
    
    console.log(`📊 ${commits.length}個のコミットを分析中...`);
    
    // 新しいエントリを生成
    let newEntry = `## [${version}] - ${today}\n\n`;
    
    // 破壊的変更
    if (categories.breaking.length > 0) {
      newEntry += `### 🚨 破壊的変更\n\n`;
      categories.breaking.forEach(commit => {
        newEntry += `- ${formatCommitMessage(commit)}\n`;
      });
      newEntry += '\n';
    }
    
    // 新機能
    if (categories.features.length > 0) {
      newEntry += `### ✨ 新機能\n\n`;
      categories.features.forEach(commit => {
        newEntry += `- ${formatCommitMessage(commit)}\n`;
      });
      newEntry += '\n';
    }
    
    // バグ修正
    if (categories.fixes.length > 0) {
      newEntry += `### 🐛 バグ修正\n\n`;
      categories.fixes.forEach(commit => {
        newEntry += `- ${formatCommitMessage(commit)}\n`;
      });
      newEntry += '\n';
    }
    
    // ドキュメント
    if (categories.docs.length > 0) {
      newEntry += `### 📚 ドキュメント\n\n`;
      categories.docs.forEach(commit => {
        newEntry += `- ${formatCommitMessage(commit)}\n`;
      });
      newEntry += '\n';
    }
    
    // リファクタリング
    if (categories.refactor.length > 0) {
      newEntry += `### ♻️ リファクタリング\n\n`;
      categories.refactor.forEach(commit => {
        newEntry += `- ${formatCommitMessage(commit)}\n`;
      });
      newEntry += '\n';
    }
    
    // テスト
    if (categories.test.length > 0) {
      newEntry += `### 🧪 テスト\n\n`;
      categories.test.forEach(commit => {
        newEntry += `- ${formatCommitMessage(commit)}\n`;
      });
      newEntry += '\n';
    }
    
    // スタイル
    if (categories.style.length > 0) {
      newEntry += `### 💄 スタイル\n\n`;
      categories.style.forEach(commit => {
        newEntry += `- ${formatCommitMessage(commit)}\n`;
      });
      newEntry += '\n';
    }
    
    // その他
    if (categories.chore.length > 0 || categories.other.length > 0) {
      newEntry += `### 🔧 その他\n\n`;
      [...categories.chore, ...categories.other].forEach(commit => {
        newEntry += `- ${formatCommitMessage(commit)}\n`;
      });
      newEntry += '\n';
    }
    
    // 既存のCHANGELOGを読み込み
    const existingChangelog = await readExistingChangelog();
    
    let fullChangelog;
    if (existingChangelog) {
      // 既存のCHANGELOGがある場合は、新しいエントリを上部に追加
      const lines = existingChangelog.split('\n');
      const headerEnd = lines.findIndex(line => line.startsWith('## ['));
      
      if (headerEnd > 0) {
        // ヘッダー部分を保持
        const header = lines.slice(0, headerEnd).join('\n');
        const rest = lines.slice(headerEnd).join('\n');
        fullChangelog = `${header}\n${newEntry}${rest}`;
      } else {
        // ヘッダーがない場合は新しいエントリを先頭に
        fullChangelog = `# 変更履歴\n\n${newEntry}${existingChangelog}`;
      }
    } else {
      // 新規作成
      fullChangelog = `# 変更履歴

このプロジェクトのすべての重要な変更がこのファイルに記録されます。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に基づいており、
このプロジェクトは [Semantic Versioning](https://semver.org/lang/ja/) に準拠しています。

${newEntry}`;
    }
    
    // CHANGELOGファイルを保存
    const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
    await fs.writeFile(changelogPath, fullChangelog, 'utf8');
    
    console.log('✅ 変更履歴を生成しました:', changelogPath);
    console.log('📊 統計:');
    console.log(`   - 総コミット数: ${commits.length}`);
    console.log(`   - 新機能: ${categories.features.length}`);
    console.log(`   - バグ修正: ${categories.fixes.length}`);
    console.log(`   - ドキュメント: ${categories.docs.length}`);
    console.log(`   - その他: ${categories.chore.length + categories.other.length + categories.style.length + categories.refactor.length + categories.test.length}`);
    
    if (categories.breaking.length > 0) {
      console.log(`   - ⚠️  破壊的変更: ${categories.breaking.length}`);
    }
    
  } catch (error) {
    console.error('❌ 変更履歴の生成に失敗しました:', error);
    process.exit(1);
  }
}

/**
 * 統計情報を生成
 */
async function generateStats() {
  try {
    const git = initGit();
    const log = await git.log();
    const commits = log.all;
    
    // 作者別統計
    const authorStats = {};
    commits.forEach(commit => {
      const author = commit.author_name;
      if (!authorStats[author]) {
        authorStats[author] = 0;
      }
      authorStats[author]++;
    });
    
    // 月別統計
    const monthlyStats = {};
    commits.forEach(commit => {
      const month = commit.date.substring(0, 7); // YYYY-MM
      if (!monthlyStats[month]) {
        monthlyStats[month] = 0;
      }
      monthlyStats[month]++;
    });
    
    const statsMarkdown = `# プロジェクト統計

このドキュメントは自動生成されています。

## 全体統計

- **総コミット数**: ${commits.length}
- **アクティブな作者数**: ${Object.keys(authorStats).length}
- **プロジェクト期間**: ${commits[commits.length - 1]?.date.split('T')[0]} 〜 ${commits[0]?.date.split('T')[0]}

## 作者別コミット数

| 作者 | コミット数 | 割合 |
|------|------------|------|
${Object.entries(authorStats)
  .sort(([,a], [,b]) => b - a)
  .map(([author, count]) => `| ${author} | ${count} | ${((count / commits.length) * 100).toFixed(1)}% |`)
  .join('\n')}

## 月別アクティビティ

| 月 | コミット数 |
|----|------------|
${Object.entries(monthlyStats)
  .sort(([a], [b]) => b.localeCompare(a))
  .map(([month, count]) => `| ${month} | ${count} |`)
  .join('\n')}

---

*生成日時: ${new Date().toISOString()}*
`;

    const statsPath = path.join(__dirname, '..', 'docs', 'STATS.md');
    await fs.mkdir(path.dirname(statsPath), { recursive: true });
    await fs.writeFile(statsPath, statsMarkdown, 'utf8');
    
    console.log('✅ プロジェクト統計を生成しました:', statsPath);
    
  } catch (error) {
    console.error('❌ 統計情報の生成に失敗しました:', error);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  generateChangelog().then(() => {
    return generateStats();
  });
}

module.exports = {
  generateChangelog,
  generateStats,
  categorizeCommits,
  getChangesSinceLastRelease,
};