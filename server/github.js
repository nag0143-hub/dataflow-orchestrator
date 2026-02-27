import { Octokit } from '@octokit/rest';

let connectionSettings;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

export async function commitFilesToRepo({ owner, repo, branch, files, commitMessage }) {
  const octokit = await getUncachableGitHubClient();

  let refData;
  try {
    refData = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  } catch (err) {
    if (err.status === 404) {
      const defaultBranch = await octokit.repos.get({ owner, repo });
      const mainRef = await octokit.git.getRef({ owner, repo, ref: `heads/${defaultBranch.data.default_branch}` });
      await octokit.git.createRef({
        owner, repo,
        ref: `refs/heads/${branch}`,
        sha: mainRef.data.object.sha,
      });
      refData = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
    } else {
      throw err;
    }
  }

  const latestCommitSha = refData.data.object.sha;
  const commitData = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
  const baseTreeSha = commitData.data.tree.sha;

  const treeItems = files.map(f => ({
    path: f.path,
    mode: '100644',
    type: 'blob',
    content: f.content,
  }));

  const newTree = await octokit.git.createTree({
    owner, repo,
    base_tree: baseTreeSha,
    tree: treeItems,
  });

  const newCommit = await octokit.git.createCommit({
    owner, repo,
    message: commitMessage,
    tree: newTree.data.sha,
    parents: [latestCommitSha],
  });

  await octokit.git.updateRef({
    owner, repo,
    ref: `heads/${branch}`,
    sha: newCommit.data.sha,
  });

  return {
    sha: newCommit.data.sha,
    branch,
    url: `https://github.com/${owner}/${repo}/commit/${newCommit.data.sha}`,
    files: files.map(f => f.path),
  };
}
