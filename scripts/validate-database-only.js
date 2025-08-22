#!/usr/bin/env node

/**
 * Validation script to ensure reports use only database data
 * This script checks for mock data, hardcoded values, and proper data flow
 */

const fs = require('fs');
const path = require('path');

// Files to check
const filesToCheck = [
  'components/reports/mobile-reports.tsx',
  'components/reports/desktop-reports.tsx',
  'components/reports/reports-content.tsx',
  'components/filters/transaction-filters.tsx',
  'components/filters/period-selector.tsx'
];

// Patterns that indicate mock data or hardcoded values
const mockDataPatterns = [
  /mock\w*/gi,
  /fake\w*/gi,
  /dummy\w*/gi,
  /test.*data/gi,
  /hardcoded/gi,
  /amount:\s*\d+/gi,
  /balance:\s*\d+/gi,
  /const\s+\w*data\s*=\s*\[/gi, // Hardcoded arrays
];

// Patterns to ignore (legitimate calculated values)
const ignorePatterns = [
  /\$\{.*\}/g, // Template literals with calculations
  /\$0/g, // Calculated zero values
  /\$.*\.toFixed/g, // Formatted calculated values
];

// Patterns that indicate proper database usage
const goodPatterns = [
  /useRepository/g,
  /repository\./g,
  /findAll\(\)/g,
  /findByUserId/g,
  /filteredTransactions/g,
  /data\.transactions/g,
];

// Patterns that should NOT exist in reports
const badPatterns = [
  /const\s+mockTransactions/gi,
  /const\s+mockCategories/gi,
  /const\s+mockAccounts/gi,
  /\[\s*{\s*id:\s*['"`]\d+['"`]/gi, // Arrays with hardcoded IDs
];

function checkFile(filePath) {
  console.log(`\n📁 Checking: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${filePath}`);
    return { passed: true, warnings: ['File not found'] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let issues = [];
  let warnings = [];
  let goodPractices = [];

  // Check for mock data patterns
  mockDataPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Check if this match should be ignored
        let shouldIgnore = false;
        ignorePatterns.forEach(ignorePattern => {
          if (ignorePattern.test(match)) {
            shouldIgnore = true;
          }
        });
        
        if (!shouldIgnore) {
          const lineNumber = findLineNumber(content, match);
          issues.push(`Line ${lineNumber}: Potential mock data - "${match}"`);
        }
      });
    }
  });

  // Check for explicitly bad patterns
  badPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const lineNumber = findLineNumber(content, match);
        issues.push(`Line ${lineNumber}: Bad pattern detected - "${match}"`);
      });
    }
  });

  // Check for good practices
  goodPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      goodPractices.push(`✅ Found ${matches.length} instances of proper database usage`);
    }
  });

  // Specific checks for reports files (exclude wrapper components)
  if (filePath.includes('reports/') && !filePath.includes('reports-content.tsx')) {
    // Check that calculations use filtered data
    if (!content.includes('filteredTransactions') && !content.includes('data.transactions')) {
      issues.push('Reports should use filteredTransactions or data.transactions for calculations');
    }

    // Check for useRepository usage
    if (!content.includes('useRepository')) {
      issues.push('Reports should use useRepository hook');
    }

    // Check for proper loading states
    if (!content.includes('loading') && !content.includes('Loading')) {
      warnings.push('Consider adding loading states');
    }
  }

  console.log(`  📊 Analysis:`);
  console.log(`    - Lines of code: ${lines.length}`);
  console.log(`    - Issues found: ${issues.length}`);
  console.log(`    - Warnings: ${warnings.length}`);
  console.log(`    - Good practices: ${goodPractices.length}`);

  if (issues.length > 0) {
    console.log(`  ❌ Issues:`);
    issues.forEach(issue => console.log(`    - ${issue}`));
  }

  if (warnings.length > 0) {
    console.log(`  ⚠️  Warnings:`);
    warnings.forEach(warning => console.log(`    - ${warning}`));
  }

  if (goodPractices.length > 0) {
    console.log(`  ✅ Good practices:`);
    goodPractices.forEach(practice => console.log(`    - ${practice}`));
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings,
    goodPractices
  };
}

function findLineNumber(content, searchString) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchString)) {
      return i + 1;
    }
  }
  return 'Unknown';
}

function main() {
  console.log('🔍 Database-Only Reports Validation');
  console.log('=====================================');

  let totalIssues = 0;
  let totalWarnings = 0;
  let filesChecked = 0;

  filesToCheck.forEach(filePath => {
    const result = checkFile(filePath);
    if (fs.existsSync(filePath)) {
      filesChecked++;
      totalIssues += result.issues.length;
      totalWarnings += result.warnings.length;
    }
  });

  console.log('\n📈 Summary');
  console.log('===========');
  console.log(`Files checked: ${filesChecked}`);
  console.log(`Total issues: ${totalIssues}`);
  console.log(`Total warnings: ${totalWarnings}`);

  if (totalIssues === 0) {
    console.log('\n🎉 SUCCESS: All reports use database-only data!');
    console.log('✅ No mock data or hardcoded values found');
    console.log('✅ Proper repository usage detected');
    console.log('✅ Database-first architecture validated');
  } else {
    console.log('\n❌ FAILED: Issues found that need to be addressed');
    console.log('Please review and fix the issues listed above');
  }

  if (totalWarnings > 0) {
    console.log(`\n⚠️  ${totalWarnings} warnings found - consider addressing these for better code quality`);
  }

  console.log('\n📋 Checklist for Database-Only Reports:');
  console.log('- [ ] No mock data or hardcoded values');
  console.log('- [ ] All calculations use real database data');
  console.log('- [ ] Proper error handling for database operations');
  console.log('- [ ] Loading states for async operations');
  console.log('- [ ] Filters applied to database queries');
  console.log('- [ ] User-specific data isolation');

  process.exit(totalIssues > 0 ? 1 : 0);
}

if (require.main === module) {
  main();
}
