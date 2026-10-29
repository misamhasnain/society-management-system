import User from "../models/User.js";
import House from "../models/House.js";
import Complaint from "../models/Complaint.js";
import Payment from "../models/Payment.js";
import Notice from "../models/Notice.js";
import Visitor from "../models/Visitor.js";
import UtilityBill from "../models/UtilityBill.js";

const ok = (res, status, message, data = {}) =>
  res.status(status).json({ success: true, message, data });

// GET /api/reports/dashboard
export const getDashboardStats = async (req, res) => {
  const now = new Date();

  const [
    totalResidents,
    pendingResidents,
    totalHouses,
    occupiedHouses,
    totalComplaints,
    pendingComplaints,
    resolvedComplaints,
    totalPayments,
    paidPayments,
    unpaidPayments,
    overduePayments,
    totalNotices,
    totalVisitors,
    activeVisitors,
    preRegisteredVisitors,
    pendingUtilityBills,
    paymentRequestsCount,
  ] = await Promise.all([
    User.countDocuments({ role: "resident", approvalStatus: "approved" }),
    User.countDocuments({ role: "resident", approvalStatus: "pending" }),
    House.countDocuments({}),
    House.countDocuments({ occupancyStatus: "Occupied" }),
    Complaint.countDocuments({}),
    Complaint.countDocuments({ status: { $in: ["Pending", "In Progress"] } }),
    Complaint.countDocuments({ status: "Resolved" }),
    Payment.countDocuments({}),
    Payment.countDocuments({ status: "Paid" }),
    Payment.countDocuments({ status: "Unpaid" }),
    Payment.countDocuments({ status: "Unpaid", dueDate: { $lt: now } }),
    Notice.countDocuments({ isArchived: false }),
    Visitor.countDocuments({}),
    Visitor.countDocuments({ status: "Inside" }),
    Visitor.countDocuments({ status: "Pre-Registered" }),
    UtilityBill.countDocuments({ status: "Pending Review" }),
    Payment.countDocuments({ paymentRequestSubmitted: true, status: "Unpaid" }),
  ]);

  // Revenue stats
  const revenueAgg = await Payment.aggregate([
    { $match: { status: "Paid" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalRevenue = revenueAgg[0]?.total || 0;

  const pendingRevenueAgg = await Payment.aggregate([
    { $match: { status: "Unpaid" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const pendingRevenue = pendingRevenueAgg[0]?.total || 0;

  // Recent complaints (last 5)
  const recentComplaints = await Complaint.find({})
    .populate("resident", "name")
    .sort({ createdAt: -1 })
    .limit(5)
    .select("title status priority category createdAt");

  // Monthly payment summary (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const monthlyPayments = await Payment.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { $substr: ["$paymentPeriod", 0, 7] },
        paid: { $sum: { $cond: [{ $eq: ["$status", "Paid"] }, "$amount", 0] } },
        unpaid: { $sum: { $cond: [{ $eq: ["$status", "Unpaid"] }, "$amount", 0] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Complaint by category
  const complaintsByCategory = await Complaint.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Complaint by status
  const complaintsByStatus = await Complaint.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  return ok(res, 200, "Dashboard stats fetched.", {
    residents: { total: totalResidents, pending: pendingResidents },
    houses: { total: totalHouses, occupied: occupiedHouses, vacant: Math.max(0, totalHouses - occupiedHouses) },
    complaints: { total: totalComplaints, pending: pendingComplaints, resolved: resolvedComplaints },
    payments: {
      total: totalPayments,
      paid: paidPayments,
      unpaid: unpaidPayments,
      overdue: overduePayments,
      totalRevenue,
      pendingRevenue,
      paymentRequests: paymentRequestsCount,
    },
    utilityBills: {
      pendingReview: pendingUtilityBills,
    },
    notices: { active: totalNotices },
    visitors: {
      total: totalVisitors,
      currentlyInside: activeVisitors,
      preRegistered: preRegisteredVisitors,
    },
    charts: {
      monthlyPayments,
      complaintsByCategory,
      complaintsByStatus,
    },
    recentComplaints,
  });
};

// GET /api/reports/residents
export const getResidentReport = async (req, res) => {
  const stats = await Promise.all([
    User.countDocuments({ role: "resident", approvalStatus: "approved", isActive: true }),
    User.countDocuments({ role: "resident", approvalStatus: "pending" }),
    User.countDocuments({ role: "resident", approvalStatus: "rejected" }),
    User.countDocuments({ role: "resident", isActive: false }),
  ]);

  const joinTrend = await User.aggregate([
    { $match: { role: "resident" } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    { $limit: 12 },
  ]);

  return ok(res, 200, "Resident report fetched.", {
    active: stats[0],
    pending: stats[1],
    rejected: stats[2],
    deactivated: stats[3],
    joinTrend,
  });
};
