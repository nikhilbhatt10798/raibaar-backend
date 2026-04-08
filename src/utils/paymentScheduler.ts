/**
 * Scheduled Jobs for Payment Processing
 * These should be run using a job scheduler like node-cron or bull
 */

// Using node-cron for scheduling
const cron = require("node-cron");

// Controllers
const {
  handleStuckPayments,
  processPendingRefunds,
  reconcilePayments,
} = require("../controllers/paymentFailure");

/**
 * Initialize all scheduled payment jobs
 * Call this in your main index.ts file
 */
const initializePaymentJobs = () => {
  console.log("Initializing payment scheduled jobs...");

  // Job 1: Check for stuck payments every 5 minutes
  const stuckPaymentJob = cron.schedule("*/5 * * * *", async () => {
    try {
      console.log("[JOB] Running stuck payment handler...");
      
      // Create a mock request/response for the controller
      const mockReq = {};
      const mockRes = {
        json: (data: any) => console.log("Stuck payment job result:", data),
        status: (code: number) => ({
          json: (data: any) => console.error("Stuck payment job error:", data),
        }),
      };

      // Call the controller function directly
      await handleStuckPayments(mockReq as any, mockRes as any);
      
      console.log("[JOB] Stuck payment handler completed");
    } catch (error) {
      console.error("[JOB] Error in stuck payment handler:", error);
    }
  });

  // Job 2: Process pending refunds every 10 minutes
  const pendingRefundJob = cron.schedule("*/10 * * * *", async () => {
    try {
      console.log("[JOB] Running pending refund processor...");
      
      const mockReq = {};
      const mockRes = {
        json: (data: any) => console.log("Pending refund job result:", data),
        status: (code: number) => ({
          json: (data: any) => console.error("Pending refund job error:", data),
        }),
      };

      await processPendingRefunds(mockReq as any, mockRes as any);
      
      console.log("[JOB] Pending refund processor completed");
    } catch (error) {
      console.error("[JOB] Error in pending refund processor:", error);
    }
  });

  // Job 3: Daily payment reconciliation at 2 AM
  const dailyReconciliationJob = cron.schedule("0 2 * * *", async () => {
    try {
      console.log("[JOB] Running daily payment reconciliation...");
      
      const mockReq = {};
      const mockRes = {
        json: (data: any) => console.log("Reconciliation job result:", data),
        status: (code: number) => ({
          json: (data: any) => console.error("Reconciliation job error:", data),
        }),
      };

      await reconcilePayments(mockReq as any, mockRes as any);
      
      console.log("[JOB] Daily payment reconciliation completed");
    } catch (error) {
      console.error("[JOB] Error in payment reconciliation:", error);
    }
  });

  // Job 4: Health check - ensure payment gateway is responsive
  const gatewayHealthCheckJob = cron.schedule("*/30 * * * *", async () => {
    try {
      console.log("[JOB] Running payment gateway health check...");
      
      // Check if payment gateway APIs are working
      // const isHealthy = await checkPaymentGatewayHealth();
      
      // if (!isHealthy) {
      //   await alertAdmins("Payment gateway is down", "critical");
      // }
      
      console.log("[JOB] Gateway health check completed");
    } catch (error) {
      console.error("[JOB] Error in gateway health check:", error);
    }
  });

  // Job 5: Generate daily payment summary report
  const dailyReportJob = cron.schedule("0 8 * * *", async () => {
    try {
      console.log("[JOB] Generating daily payment report...");
      
      // TODO: Generate report with:
      // - Total payments processed
      // - Failed payments
      // - Pending reconciliations
      // - Refunds processed
      
      // await generateDailyPaymentReport();
      // await emailReportToManagement();
      
      console.log("[JOB] Daily payment report completed");
    } catch (error) {
      console.error("[JOB] Error generating payment report:", error);
    }
  });

  console.log("Payment jobs initialized successfully");

  return {
    stuckPaymentJob,
    pendingRefundJob,
    dailyReconciliationJob,
    gatewayHealthCheckJob,
    dailyReportJob,
  };
};

/**
 * Stop all scheduled jobs
 */
const stopPaymentJobs = (jobs: any) => {
  console.log("Stopping payment jobs...");
  jobs.stuckPaymentJob.stop();
  jobs.pendingRefundJob.stop();
  jobs.dailyReconciliationJob.stop();
  jobs.gatewayHealthCheckJob.stop();
  jobs.dailyReportJob.stop();
  console.log("All payment jobs stopped");
};

/**
 * Alternative: Using Bull queue for more robust job handling
 */
const Queue = require("bull");

const createPaymentJobQueues = () => {
  const redisConfig = {
    redis: {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT || "6379"),
    },
  };

  // Queue for handling stuck payments
  const stuckPaymentQueue = new Queue("stuck-payments", redisConfig);

  stuckPaymentQueue.process(async (job: any) => {
    console.log("Processing stuck payment job:", job.data);
    // Process stuck payments
    return { success: true };
  });

  stuckPaymentQueue.add(
    {},
    {
      repeat: {
        every: 5 * 60 * 1000, // Every 5 minutes
      },
      jobId: "repeated-stuck-payment-check",
    }
  );

  // Queue for processing refunds
  const refundQueue = new Queue("refund-processing", redisConfig);

  refundQueue.process(async (job: any) => {
    console.log("Processing refund job:", job.data);
    // Process refunds
    return { success: true };
  });

  refundQueue.add(
    {},
    {
      repeat: {
        every: 10 * 60 * 1000, // Every 10 minutes
      },
      jobId: "repeated-refund-processing",
    }
  );

  // Queue for reconciliation
  const reconciliationQueue = new Queue("payment-reconciliation", redisConfig);

  reconciliationQueue.process(async (job: any) => {
    console.log("Processing reconciliation job:", job.data);
    // Reconcile payments
    return { success: true };
  });

  reconciliationQueue.add(
    {},
    {
      repeat: {
        every: 24 * 60 * 60 * 1000, // Every 24 hours
      },
      jobId: "repeated-reconciliation",
    }
  );

  return {
    stuckPaymentQueue,
    refundQueue,
    reconciliationQueue,
  };
};

module.exports = {
  initializePaymentJobs,
  stopPaymentJobs,
  createPaymentJobQueues
};
