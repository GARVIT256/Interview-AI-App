const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const asyncHandler = require('../middleware/asyncHandler');
const interviewService = require('../services/interview.service');
const InterviewReport = require('../models/interviewReport.model');
const { AppError } = require('../middleware/errorHandler');

/**
 * @desc    Generate the final report for a completed interview
 * @route   POST /api/reports/:sessionId
 * @access  Private
 */
router.post('/:sessionId', protect, asyncHandler(async (req, res) => {
    const report = await interviewService.finalizeAndGenerateReport(req.params.sessionId);
    res.status(201).json({ success: true, data: report });
}));

/**
 * @desc    Get the final report for an interview. If it doesn't exist, create it.
 * @route   GET /api/reports/:sessionId
 * @access  Private
 */
router.get('/:sessionId', protect, asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    let report = await InterviewReport.findOne({ session: sessionId }).populate({
        path: 'session',
        populate: [
            { path: 'candidate', select: 'firstName lastName email' },
            { path: 'template', select: 'title' }
        ]
    });
    
    if (report) {
        return res.status(200).json({ success: true, data: report });
    }

    console.log(`Report for session ${sessionId} not found. Generating on-demand...`);
    const newReport = await interviewService.finalizeAndGenerateReport(sessionId);

    const populatedReport = await InterviewReport.findById(newReport._id).populate({
        path: 'session',
        populate: [
            { path: 'candidate', select: 'firstName lastName email' },
            { path: 'template', select: 'title' }
        ]
    });
    
    if (!populatedReport) {
        throw new AppError(500, 'Failed to retrieve the report after generating it.');
    }

    res.status(200).json({ success: true, data: populatedReport });
}));

/**
 * NEW: Get all individual responses for a given session.
 * @desc    Get paginated responses for a specific interview session.
 * @route   GET /api/reports/:sessionId/responses
 * @access  Private
 */
router.get('/:sessionId/responses', protect, asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;

    const data = await interviewService.getSessionResponses(sessionId, page, limit);

    res.status(200).json({ success: true, ...data });
}));

module.exports = router;