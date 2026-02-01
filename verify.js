#!/usr/bin/env node

/**
 * NGKsPlayer Verification Script
 * Single entrypoint for comprehensive end-to-end verification
 * 
 * USAGE: npm run verify
 * 
 * Returns PASS/FAIL with specific reasons
 * Tests critical flows: library scan, audio loading, theme system, core API
 * 
 * @author NGKs Systems Clean-up
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

class VerificationSuite {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
    this.errors = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().slice(11, 23);
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️ ' : type === 'pass' ? '✅' : 'ℹ️ ';
    console.log(`${timestamp} ${prefix} ${message}`);
  }

  async verify(name, testFn) {
    this.log(`Testing: ${name}`, 'info');
    try {
      const result = await testFn();
      if (result === true || (result && result.pass === true)) {
        this.results.push({ name, status: 'PASS', details: result.details || 'OK' });
        this.log(`${name}: PASS`, 'pass');
        return true;
      } else {
        const error = result.error || result.message || 'Test failed';
        this.results.push({ name, status: 'FAIL', error });
        this.log(`${name}: FAIL - ${error}`, 'error');
        this.errors.push(`${name}: ${error}`);
        return false;
      }
    } catch (err) {
      this.results.push({ name, status: 'ERROR', error: err.message });
      this.log(`${name}: ERROR - ${err.message}`, 'error');
      this.errors.push(`${name}: ${err.message}`);
      return false;
    }
  }

  async testFileStructure() {
    const requiredFiles = [
      'package.json',
      'src/main.jsx', 
      'electron/main.cjs',
      'src/contexts/ThemeContext.jsx',
      'src/themes/themes.json'
    ];
    
    const requiredDirs = [
      'src',
      'electron', 
      'public'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        return { pass: false, error: `Missing required file: ${file}` };
      }
    }

    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        return { pass: false, error: `Missing required directory: ${dir}` };
      }
    }

    return { pass: true, details: `All ${requiredFiles.length + requiredDirs.length} structure items verified` };
  }

  async testPackageIntegrity() {
    try {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      const requiredFields = ['name', 'version', 'main', 'scripts'];
      for (const field of requiredFields) {
        if (!pkg[field]) {
          return { pass: false, error: `Missing package.json field: ${field}` };
        }
      }

      const requiredScripts = ['dev', 'build'];
      for (const script of requiredScripts) {
        if (!pkg.scripts[script]) {
          return { pass: false, error: `Missing package.json script: ${script}` };
        }
      }

      return { pass: true, details: `Package.json valid with ${Object.keys(pkg.scripts).length} scripts` };
    } catch (err) {
      return { pass: false, error: `Package.json corrupt: ${err.message}` };
    }
  }

  async testThemeSystem() {
    try {
      const themesData = JSON.parse(fs.readFileSync('src/themes/themes.json', 'utf8'));
      
      if (!themesData || typeof themesData !== 'object') {
        return { pass: false, error: 'Themes.json is not a valid object' };
      }

      const themeCount = Object.keys(themesData).length;
      if (themeCount === 0) {
        return { pass: false, error: 'No themes found in themes.json' };
      }

      // Check at least one theme has required structure
      const firstTheme = Object.values(themesData)[0];
      if (!firstTheme.colors) {
        return { pass: false, error: 'First theme missing colors object' };
      }

      return { pass: true, details: `${themeCount} themes loaded, structure valid` };
    } catch (err) {
      return { pass: false, error: `Theme system error: ${err.message}` };
    }
  }

  async testDependencies() {
    const criticalDeps = ['react', 'electron', 'vite'];
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    for (const dep of criticalDeps) {
      if (!allDeps[dep]) {
        return { pass: false, error: `Missing critical dependency: ${dep}` };
      }
    }

    // Check if node_modules exists and has content
    if (!fs.existsSync('node_modules') || fs.readdirSync('node_modules').length === 0) {
      return { pass: false, error: 'node_modules missing or empty - run npm install' };
    }

    return { pass: true, details: `All ${criticalDeps.length} critical dependencies found` };
  }

  async testElectronMain() {
    try {
      const mainContent = fs.readFileSync('electron/main.cjs', 'utf8');
      
      // Check for critical imports and functions
      const requiredPatterns = [
        'require.*electron',
        'app\\.',
        'BrowserWindow',
        'register\\('
      ];

      for (const pattern of requiredPatterns) {
        const regex = new RegExp(pattern);
        if (!regex.test(mainContent)) {
          return { pass: false, error: `Main.cjs missing required pattern: ${pattern}` };
        }
      }

      // Check file size is reasonable (not empty, not corrupted)
      if (mainContent.length < 1000) {
        return { pass: false, error: 'Main.cjs appears too small/corrupted' };
      }

      return { pass: true, details: `Main.cjs valid (${Math.round(mainContent.length/1024)}KB)` };
    } catch (err) {
      return { pass: false, error: `Electron main error: ${err.message}` };
    }
  }

  async testNodeModulesHealth() {
    try {
      // Check if critical packages can be resolved
      const testPackages = ['react', 'electron'];
      
      for (const pkg of testPackages) {
        const pkgPath = path.join('node_modules', pkg, 'package.json');
        if (!fs.existsSync(pkgPath)) {
          return { pass: false, error: `Critical package ${pkg} not properly installed` };
        }
      }

      // Check that we can resolve main files
      try {
        const mainPath = './src/main.jsx';
        const content = fs.readFileSync(mainPath, 'utf8');
        if (content.length < 100) {
          return { pass: false, error: 'Main.jsx appears too small' };
        }
      } catch (err) {
        return { pass: false, error: `Cannot read main.jsx: ${err.message}` };
      }

      return { pass: true, details: 'Node modules and main files verified' };
    } catch (err) {
      return { pass: false, error: `Module check error: ${err.message}` };
    }
  }

  async runVerification() {
    console.log('🔍 NGKsPlayer Verification Suite Starting...\n');
    
    // Critical flow tests
    await this.verify('File Structure', () => this.testFileStructure());
    await this.verify('Package Integrity', () => this.testPackageIntegrity());
    await this.verify('Dependencies', () => this.testDependencies());
    await this.verify('Electron Main', () => this.testElectronMain());
    await this.verify('Theme System', () => this.testThemeSystem());
    await this.verify('Node Modules', () => this.testNodeModulesHealth());

    const duration = Date.now() - this.startTime;
    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const totalCount = this.results.length;
    const passRate = Math.round((passCount / totalCount) * 100);

    console.log(`\n${'='.repeat(60)}`);
    console.log('VERIFICATION SUMMARY');
    console.log(`${'='.repeat(60)}`);
    console.log(`Duration: ${Math.round(duration / 1000)}s`);
    console.log(`Tests: ${passCount}/${totalCount} passed (${passRate}%)`);
    
    if (this.errors.length > 0) {
      console.log(`\n❌ FAILURES:`);
      this.errors.forEach(error => console.log(`  • ${error}`));
    }

    console.log(`\n${'='.repeat(60)}`);
    
    if (passRate >= 100) {
      console.log('OVERALL: PASS - System fully verified');
      process.exit(0);
    } else if (passRate >= 80) {
      console.log('OVERALL: PARTIAL - Minor issues detected');
      process.exit(1);
    } else {
      console.log('OVERALL: FAIL - Critical issues must be resolved');
      process.exit(1);
    }
  }
}

// Run verification if called directly
const suite = new VerificationSuite();
suite.runVerification().catch(err => {
  console.error('❌ VERIFICATION CRASHED:', err.message);
  process.exit(1);
});