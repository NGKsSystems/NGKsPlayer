/**
 * Testing Orchestrator - Properly Designed Testing Robot
 * 
 * Uses existing Jest infrastructure and orchestrates comprehensive testing
 * 
 * @author NGKs Systems
 * @version 1.0.0
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export class TestingOrchestrator {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || './test-results',
      verbose: options.verbose || false,
      parallel: options.parallel !== false,
      generateReports: options.generateReports !== false,
      ...options
    };
    
    this.results = {
      timestamp: new Date().toISOString(),
      testRuns: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
      environment: this.getEnvironmentInfo(),
      duration: 0
    };
  }

  getEnvironmentInfo() {
    return {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      cwd: process.cwd(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Run comprehensive testing by orchestrating existing Jest test suites
   */
  async runComprehensiveTesting() {
    console.log('🤖 Starting NGKs Player Comprehensive Testing...');
    const startTime = Date.now();

    try {
      // Ensure output directory exists
      if (!fs.existsSync(this.options.outputDir)) {
        fs.mkdirSync(this.options.outputDir, { recursive: true });
      }

      // Run different test categories in sequence
      await this.runTestCategory('all', 'Complete test suite');
      await this.runTestCategory('audio', 'Audio engine tests');
      await this.runTestCategory('components', 'UI component tests');
      
      // Generate coverage report
      await this.runCoverageAnalysis();

      this.results.duration = Date.now() - startTime;
      
      if (this.options.generateReports) {
        await this.generateComprehensiveReport();
      }

      return this.results;

    } catch (error) {
      console.error('❌ Comprehensive testing failed:', error.message);
      throw error;
    }
  }

  /**
   * Run quick validation tests
   */
  async runQuickTests() {
    console.log('⚡ Starting Quick System Validation...');
    const startTime = Date.now();

    try {
      // Run essential tests only - use existing Jest tests
      await this.runTestCategory('essential', 'Essential system tests', ['--testPathPattern=(main|core|basic)']);
      
      this.results.duration = Date.now() - startTime;
      
      if (this.options.generateReports) {
        await this.generateQuickReport();
      }

      return this.results;

    } catch (error) {
      console.error('❌ Quick testing failed:', error.message);
      throw error;
    }
  }

  /**
   * Run audio-specific tests
   */
  async runAudioTests() {
    console.log('🎵 Starting Audio Engine Testing...');
    const startTime = Date.now();

    try {
      await this.runTestCategory('audio', 'Audio engine tests', ['--testPathPattern=audio']);
      
      this.results.duration = Date.now() - startTime;
      
      if (this.options.generateReports) {
        await this.generateAudioReport();
      }

      return this.results;

    } catch (error) {
      console.error('❌ Audio testing failed:', error.message);
      throw error;
    }
  }

  /**
   * Run UI component tests
   */
  async runUITests() {
    console.log('🖥️ Starting UI Component Testing...');
    const startTime = Date.now();

    try {
      await this.runTestCategory('ui', 'UI component tests', ['--testPathPattern=components']);
      
      this.results.duration = Date.now() - startTime;
      
      if (this.options.generateReports) {
        await this.generateUIReport();
      }

      return this.results;

    } catch (error) {
      console.error('❌ UI testing failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute a Jest test run and capture results
   */
  async runTestCategory(category, description, extraArgs = []) {
    console.log(`\n🧪 Running ${description}...`);
    
    const testRun = {
      category,
      description,
      startTime: Date.now(),
      status: 'running',
      output: '',
      results: null
    };

    this.results.testRuns.push(testRun);

    return new Promise((resolve, reject) => {
      // Build Jest command - use npx for better compatibility
      const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const jestArgs = [
        'run',
        'test',
        '--passWithNoTests',  // Don't fail if no tests match
        ...extraArgs
      ];

      // Only add JSON output if we have write permissions
      try {
        const resultsPath = path.join(this.options.outputDir, `${category}-results.json`);
        jestArgs.push('--json', '--outputFile=' + resultsPath);
      } catch (error) {
        console.log(`  ⚠️ Cannot write JSON results: ${error.message}`);
      }

      if (this.options.verbose) {
        jestArgs.push('--verbose');
      }

      const jestProcess = spawn(command, jestArgs, {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true  // Use shell for Windows compatibility
      });

      let stdout = '';
      let stderr = '';

      jestProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        if (this.options.verbose) {
          process.stdout.write(data);
        }
      });

      jestProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        if (this.options.verbose) {
          process.stderr.write(data);
        }
      });

      jestProcess.on('close', (code) => {
        testRun.endTime = Date.now();
        testRun.duration = testRun.endTime - testRun.startTime;
        testRun.exitCode = code;
        testRun.output = stdout;
        testRun.errors = stderr;

        try {
          // Try to read Jest JSON output
          const resultsPath = path.join(this.options.outputDir, `${category}-results.json`);
          if (fs.existsSync(resultsPath)) {
            testRun.results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
            
            // Update summary
            if (testRun.results.numTotalTests) {
              this.results.summary.total += testRun.results.numTotalTests;
              this.results.summary.passed += testRun.results.numPassedTests;
              this.results.summary.failed += testRun.results.numFailedTests;
              this.results.summary.skipped += testRun.results.numPendingTests;
            }
          }

          if (code === 0) {
            testRun.status = 'passed';
            console.log(`  ✅ ${description} completed successfully`);
          } else {
            testRun.status = 'failed';
            console.log(`  ❌ ${description} failed with exit code ${code}`);
          }

          resolve(testRun);

        } catch (error) {
          testRun.status = 'error';
          testRun.error = error.message;
          console.log(`  💥 ${description} crashed: ${error.message}`);
          reject(error);
        }
      });

      jestProcess.on('error', (error) => {
        testRun.status = 'error';
        testRun.error = error.message;
        console.log(`  💥 Failed to start ${description}: ${error.message}`);
        reject(error);
      });
    });
  }

  /**
   * Run coverage analysis
   */
  async runCoverageAnalysis() {
    console.log('\n📊 Generating code coverage analysis...');
    
    return new Promise((resolve, reject) => {
      const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const coverageProcess = spawn(command, ['run', 'test:coverage'], {
        cwd: process.cwd(),
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        shell: true
      });

      coverageProcess.on('close', (code) => {
        if (code === 0) {
          console.log('  ✅ Coverage analysis completed');
          resolve();
        } else {
          console.log('  ⚠️ Coverage analysis completed with warnings');
          resolve(); // Don't fail the whole process
        }
      });

      coverageProcess.on('error', (error) => {
        console.log(`  ⚠️ Coverage analysis failed: ${error.message}`);
        resolve(); // Don't fail the whole process
      });
    });
  }

  /**
   * Generate comprehensive HTML report
   */
  async generateComprehensiveReport() {
    const reportPath = path.join(this.options.outputDir, 'comprehensive-report.html');
    const passRate = this.results.summary.total > 0 
      ? ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(2)
      : 0;

    const html = this.generateHTMLReport('Comprehensive Test Report', passRate);
    fs.writeFileSync(reportPath, html);
    
    console.log(`\n📊 Comprehensive report: ${reportPath}`);
  }

  /**
   * Generate quick test report
   */
  async generateQuickReport() {
    const reportPath = path.join(this.options.outputDir, 'quick-report.html');
    const passRate = this.results.summary.total > 0 
      ? ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(2)
      : 0;

    const html = this.generateHTMLReport('Quick Validation Report', passRate);
    fs.writeFileSync(reportPath, html);
    
    console.log(`\n📊 Quick report: ${reportPath}`);
  }

  /**
   * Generate audio test report
   */
  async generateAudioReport() {
    const reportPath = path.join(this.options.outputDir, 'audio-report.html');
    const passRate = this.results.summary.total > 0 
      ? ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(2)
      : 0;

    const html = this.generateHTMLReport('Audio Engine Test Report', passRate);
    fs.writeFileSync(reportPath, html);
    
    console.log(`\n📊 Audio report: ${reportPath}`);
  }

  /**
   * Generate UI test report
   */
  async generateUIReport() {
    const reportPath = path.join(this.options.outputDir, 'ui-report.html');
    const passRate = this.results.summary.total > 0 
      ? ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(2)
      : 0;

    const html = this.generateHTMLReport('UI Component Test Report', passRate);
    fs.writeFileSync(reportPath, html);
    
    console.log(`\n📊 UI report: ${reportPath}`);
  }

  /**
   * Generate HTML report template
   */
  generateHTMLReport(title, passRate) {
    const timestamp = new Date().toLocaleString();
    const statusClass = passRate >= 90 ? 'success' : passRate >= 70 ? 'warning' : 'danger';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; line-height: 1.6; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 12px; text-align: center; margin-bottom: 30px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
        .header h1 { margin: 0; font-size: 2.8em; font-weight: 300; }
        .header p { margin: 15px 0 0 0; opacity: 0.9; font-size: 1.2em; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 25px; margin-bottom: 40px; }
        .metric { background: white; padding: 25px; border-radius: 12px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.08); transition: transform 0.2s; }
        .metric:hover { transform: translateY(-2px); }
        .metric-value { font-size: 2.5em; font-weight: bold; margin-bottom: 8px; }
        .metric-label { color: #6c757d; font-size: 0.95em; font-weight: 500; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .test-runs { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
        .test-run { border-left: 4px solid #e9ecef; padding: 20px; margin-bottom: 20px; background: #f8f9fa; border-radius: 0 8px 8px 0; }
        .test-run.passed { border-left-color: #28a745; }
        .test-run.failed { border-left-color: #dc3545; }
        .test-run.error { border-left-color: #ffc107; }
        .test-run h3 { margin: 0 0 10px 0; color: #333; }
        .test-run-meta { display: flex; gap: 20px; color: #6c757d; font-size: 0.9em; margin-bottom: 10px; }
        .test-run-details { color: #555; }
        .footer { text-align: center; margin-top: 40px; padding: 20px; color: #6c757d; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 500; }
        .badge.passed { background: #d4edda; color: #155724; }
        .badge.failed { background: #f8d7da; color: #721c24; }
        .badge.error { background: #fff3cd; color: #856404; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 ${title}</h1>
            <p>NGKs Player Automated Testing Results - ${timestamp}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value ${statusClass}">${this.results.summary.total}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value success">${this.results.summary.passed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value danger">${this.results.summary.failed}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${this.results.summary.skipped}</div>
                <div class="metric-label">Skipped</div>
            </div>
            <div class="metric">
                <div class="metric-value ${statusClass}">${passRate}%</div>
                <div class="metric-label">Pass Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(this.results.duration / 1000).toFixed(2)}s</div>
                <div class="metric-label">Total Duration</div>
            </div>
        </div>

        <div class="test-runs">
            <h2>📋 Test Execution Summary</h2>
            ${this.results.testRuns.map(run => `
                <div class="test-run ${run.status}">
                    <h3>${run.description} <span class="badge ${run.status}">${run.status.toUpperCase()}</span></h3>
                    <div class="test-run-meta">
                        <span>⏱️ ${run.duration ? (run.duration / 1000).toFixed(2) + 's' : 'N/A'}</span>
                        <span>🏷️ ${run.category}</span>
                        ${run.exitCode !== undefined ? `<span>🔢 Exit Code: ${run.exitCode}</span>` : ''}
                    </div>
                    ${run.results ? `
                        <div class="test-run-details">
                            <strong>Results:</strong> ${run.results.numPassedTests}/${run.results.numTotalTests} tests passed
                            ${run.results.numFailedTests > 0 ? `<br><strong>Failures:</strong> ${run.results.numFailedTests}` : ''}
                        </div>
                    ` : ''}
                    ${run.error ? `<div class="test-run-details"><strong>Error:</strong> ${run.error}</div>` : ''}
                </div>
            `).join('')}
        </div>

        <div class="footer">
            <p>🤖 Testing Orchestrator v1.0.0 - Powered by Jest & NGKs Systems</p>
            <p>Report generated at ${timestamp}</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Print results summary to console
   */
  printSummary() {
    const passRate = this.results.summary.total > 0 
      ? ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(2)
      : 0;

    console.log('\n' + '='.repeat(70));
    console.log('🤖 TESTING ORCHESTRATOR RESULTS');
    console.log('='.repeat(70));
    console.log(`📊 Total Tests: ${this.results.summary.total}`);
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`⏭️ Skipped: ${this.results.summary.skipped}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    console.log(`⏱️ Duration: ${(this.results.duration / 1000).toFixed(2)}s`);
    
    console.log('\n📋 Test Categories:');
    this.results.testRuns.forEach(run => {
      const status = run.status === 'passed' ? '✅' : run.status === 'failed' ? '❌' : '⚠️';
      console.log(`  ${status} ${run.description} - ${run.status}`);
    });

    if (passRate >= 95) {
      console.log('\n🎉 EXCELLENT! All systems operational.');
    } else if (passRate >= 85) {
      console.log('\n👍 GOOD! Minor issues detected.');
    } else if (passRate >= 70) {
      console.log('\n⚠️ WARNING! Multiple issues need attention.');
    } else {
      console.log('\n🚨 CRITICAL! Major issues detected - immediate action required!');
    }

    console.log('='.repeat(70));
  }
}