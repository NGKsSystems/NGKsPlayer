#!/usr/bin/env node

/**
 * NGKs Player Testing Robot Executor
 * 
 * Command-line interface for running comprehensive automated testing
 * Uses existing Jest infrastructure properly
 * 
 * Usage:
 *   npm run test:robot              # Run all tests
 *   npm run test:robot -- --audio   # Audio tests only
 *   npm run test:robot -- --ui      # UI tests only
 *   npm run test:robot -- --quick   # Quick test suite
 * 
 * @author NGKs Systems
 * @version 1.0.0
 */

import { TestingOrchestrator } from './src/testing/TestingOrchestrator.js';
import fs from 'fs';
import path from 'path';

class TestingRobotCLI {
  constructor() {
    this.args = process.argv.slice(2);
    this.options = this.parseArgs();
  }

  parseArgs() {
    const options = {
      audio: this.args.includes('--audio'),
      ui: this.args.includes('--ui'),
      performance: this.args.includes('--performance'),
      quick: this.args.includes('--quick'),
      verbose: this.args.includes('--verbose') || this.args.includes('-v'),
      output: this.getArgValue('--output') || './test-results',
      parallel: !this.args.includes('--sequential'),
      generateReports: !this.args.includes('--no-reports')
    };

    // If specific test types are specified, disable others
    if (options.audio || options.ui || options.performance) {
      options.includeAll = false;
    } else {
      options.includeAll = true;
    }

    return options;
  }

  getArgValue(arg) {
    const index = this.args.indexOf(arg);
    return index !== -1 && index + 1 < this.args.length ? this.args[index + 1] : null;
  }

  async run() {
    console.log('🤖 NGKs Player Testing Robot v1.0.0');
    console.log('=====================================\\n');

    if (this.args.includes('--help') || this.args.includes('-h')) {
      this.showHelp();
      return;
    }

    // Create output directory
    if (!fs.existsSync(this.options.output)) {
      fs.mkdirSync(this.options.output, { recursive: true });
    }

    try {
      // Initialize testing orchestrator (uses existing Jest infrastructure)
      const orchestrator = new TestingOrchestrator({
        outputDir: this.options.output,
        verbose: this.options.verbose,
        parallel: this.options.parallel,
        generateReports: this.options.generateReports
      });

      let results;

      if (this.options.quick) {
        console.log('⚡ Running quick test suite...');
        results = await orchestrator.runQuickTests();
      } else if (this.options.audio) {
        console.log('🎵 Running audio engine tests...');
        results = await orchestrator.runAudioTests();
      } else if (this.options.ui) {
        console.log('🖥️ Running UI component tests...');
        results = await orchestrator.runUITests();
      } else {
        console.log('🚀 Running comprehensive test suite...');
        results = await orchestrator.runComprehensiveTesting();
      }

      // Print summary
      orchestrator.printSummary();

      // Exit with appropriate code
      const exitCode = this.getExitCode(results);
      process.exit(exitCode);

    } catch (error) {
      console.error('❌ Testing robot failed:', error.message);
      if (this.options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  getExitCode(results) {
    if (!results.summary) return 1;
    
    const passRate = results.summary.total > 0 
      ? ((results.summary.passed / results.summary.total) * 100)
      : 0;
    
    if (passRate >= 95) return 0;      // Excellent
    if (passRate >= 85) return 0;      // Good 
    if (passRate >= 70) return 1;      // Warning
    return 2;                          // Critical
  }

  showHelp() {
    console.log(`
🤖 NGKs Player Testing Robot v1.0.0

USAGE:
  npm run test:robot [options]

OPTIONS:
  --audio              Run audio engine tests only
  --ui                 Run UI component tests only  
  --performance        Run performance tests only
  --quick              Run quick validation suite
  --verbose, -v        Enable verbose output
  --output <dir>       Output directory for reports (default: ./test-results)
  --sequential         Run tests sequentially (default: parallel)
  --no-reports         Skip report generation
  --help, -h           Show this help message

EXAMPLES:
  npm run test:robot                    # Run comprehensive test suite
  npm run test:robot -- --quick         # Quick system validation
  npm run test:robot -- --audio -v      # Verbose audio testing
  npm run test:robot -- --ui --output ./ui-results

DESCRIPTION:
  The Testing Robot automatically validates every aspect of NGKs Player:
  
  🎵 Audio Engine - Processing, effects, codecs, performance
  🖥️ User Interface - Components, interactions, accessibility  
  🔗 Integration - End-to-end workflows and data flow
  ⚡ Performance - Memory, CPU, latency, load handling
  🔄 Regression - Feature and compatibility validation
  
  Reports are generated in HTML and JSON formats for detailed analysis.

For more information, visit: https://github.com/ngkssystems/ngksplayer
`);
  }
}

// Run the CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new TestingRobotCLI();
  cli.run().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

export { TestingRobotCLI };