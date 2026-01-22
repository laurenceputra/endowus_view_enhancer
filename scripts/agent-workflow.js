#!/usr/bin/env node
/**
 * CLI helper for invoking agents and managing workflow
 * Usage: ./scripts/agent-workflow.js [command] [args]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const AGENTS = {
    'product-manager': 'Product Manager - Requirements framing and scope definition',
    'staff-engineer': 'Staff Engineer - Architecture, design, and implementation',
    'qa-engineer': 'QA Engineer - Testing strategy and quality verification',
    'code-reviewer': 'Code Reviewer - Final quality gates and code review',
    'devils-advocate': "Devil's Advocate - Risk surfacing and assumption challenging"
};

const PHASES = {
    'planning': 'Product Manager defines requirements',
    'design': 'Staff Engineer proposes solution',
    'risk-assessment': 'Devil\'s Advocate challenges assumptions',
    'implementation': 'Staff Engineer implements code',
    'qa': 'QA Engineer tests and verifies',
    'review': 'Code Reviewer applies final gates'
};

function showHelp() {
    console.log(`
Goal Portfolio Viewer - Agent Workflow CLI

USAGE:
  npm run workflow [command] [options]

COMMANDS:
  list-agents              List all available agents
  list-phases              List workflow phases
  invoke <agent> <task>    Invoke specific agent with task
  status                   Show current workflow status
  checklist <phase>        Show checklist for phase
  metrics                  Display workflow metrics

EXAMPLES:
  npm run workflow list-agents
  npm run workflow invoke product-manager "Define requirements for CSV export"
  npm run workflow checklist planning
  npm run workflow status

AGENT SHORTCUTS:
  pm     Product Manager
  se     Staff Engineer
  qa     QA Engineer
  cr     Code Reviewer
  da     Devil's Advocate
`);
}

function listAgents() {
    console.log('\n📋 Available Agents:\n');
    Object.entries(AGENTS).forEach(([key, description]) => {
        console.log(`  ${key.padEnd(20)} ${description}`);
    });
    console.log('\nFor detailed information, see: .github/agents/QUICK_REFERENCE.md\n');
}

function listPhases() {
    console.log('\n🔄 Workflow Phases:\n');
    Object.entries(PHASES).forEach(([key, description], index) => {
        console.log(`  ${index + 1}. ${key.padEnd(20)} ${description}`);
    });
    console.log('\nFor detailed workflow, see: .github/agents/ORCHESTRATION.md\n');
}

function showChecklist(phase) {
    const checklists = {
        'planning': [
            'Acceptance criteria clear and testable',
            'Success metrics defined',
            'Constraints documented',
            'Staff Engineer confirms criteria are testable',
            'QA Engineer confirms criteria are verifiable'
        ],
        'design': [
            'Technical approach documented',
            'Risks and tradeoffs identified',
            'Testability confirmed',
            'Product Manager agrees on scope',
            'QA Engineer agrees on test approach'
        ],
        'risk-assessment': [
            'All key assumptions tested',
            'Unmentioned risks surfaced',
            'Tradeoffs challenged',
            'Blind spots identified',
            'Mitigations documented'
        ],
        'implementation': [
            'Code complete',
            'Unit tests written and passing',
            'Documentation updated',
            'Version bumped (if behavior changed)',
            'Linter passing'
        ],
        'qa': [
            'Test plan executed',
            'All acceptance criteria verified',
            'Edge cases tested',
            'Performance acceptable',
            'Security checks passed'
        ],
        'review': [
            'Code quality meets standards',
            'No security vulnerabilities',
            'Documentation updated',
            'All tests passing',
            'No blocking issues'
        ]
    };

    if (!checklists[phase]) {
        console.error(`❌ Unknown phase: ${phase}`);
        console.log(`Available phases: ${Object.keys(checklists).join(', ')}`);
        process.exit(1);
    }

    console.log(`\n✅ Checklist for ${phase.toUpperCase()} phase:\n`);
    checklists[phase].forEach((item, index) => {
        console.log(`  ${index + 1}. [ ] ${item}`);
    });
    console.log();
}

function showStatus() {
    console.log('\n📊 Workflow Status\n');
    
    try {
        // Check Git status
        const gitStatus = execSync('git status --short', { encoding: 'utf-8' });
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
        
        console.log(`Current Branch: ${branch}`);
        console.log(`Modified Files: ${gitStatus ? gitStatus.split('\n').length - 1 : 0}`);
        
        // Check test status
        try {
            execSync('npm test 2>&1', { encoding: 'utf-8', stdio: 'pipe' });
            console.log('Tests: ✅ Passing');
        } catch (e) {
            console.log('Tests: ❌ Failing');
        }
        
        // Check linter status
        try {
            execSync('npm run lint 2>&1', { encoding: 'utf-8', stdio: 'pipe' });
            console.log('Linter: ✅ Passing');
        } catch (e) {
            console.log('Linter: ❌ Failing');
        }
        
        // Check version consistency
        const userscriptVersion = fs.readFileSync('tampermonkey/goal_portfolio_viewer.user.js', 'utf-8')
            .match(/@version\s+([\d.]+)/)?.[1];
        const packageVersion = JSON.parse(fs.readFileSync('package.json', 'utf-8')).version;
        
        if (userscriptVersion === packageVersion) {
            console.log(`Version: ✅ ${packageVersion} (consistent)`);
        } else {
            console.log(`Version: ❌ Mismatch (userscript: ${userscriptVersion}, package: ${packageVersion})`);
        }
        
    } catch (error) {
        console.error('Error getting status:', error.message);
    }
    
    console.log('\nFor detailed workflow state, see: .github/agents/ORCHESTRATION.md\n');
}

function showMetrics() {
    console.log('\n📈 Workflow Metrics\n');
    console.log('To track metrics for a PR, use the template:');
    console.log('  .github/agents/METRICS_TEMPLATE.md\n');
    console.log('Copy and fill out for each significant feature or bug fix.\n');
}

// Parse command line arguments
const [,, command, ...args] = process.argv;

switch (command) {
    case 'list-agents':
        listAgents();
        break;
    case 'list-phases':
        listPhases();
        break;
    case 'checklist':
        if (!args[0]) {
            console.error('❌ Please specify a phase');
            console.log('Usage: npm run workflow checklist <phase>');
            process.exit(1);
        }
        showChecklist(args[0]);
        break;
    case 'status':
        showStatus();
        break;
    case 'metrics':
        showMetrics();
        break;
    case 'invoke':
        console.log('\n💡 To invoke agents in GitHub Copilot:');
        console.log(`   @${args[0] || 'agent-name'} "${args.slice(1).join(' ') || 'your task description'}"\n`);
        console.log('For more details, see: .github/agents/QUICK_REFERENCE.md\n');
        break;
    case 'help':
    case '--help':
    case '-h':
        showHelp();
        break;
    default:
        if (!command) {
            showHelp();
        } else {
            console.error(`❌ Unknown command: ${command}`);
            showHelp();
            process.exit(1);
        }
}
