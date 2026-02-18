const Class = require('../models/Class');
const User = require('../models/User');

exports.createClass = async (req, res) => {
    try {
        const { name, type, description } = req.body;
        const existingClass = await Class.findOne({ name });
        if (existingClass) {
            return res.status(400).json({ message: 'Class with this name already exists' });
        }
        const newClass = new Class({ name, type, description });
        await newClass.save();
        res.status(201).json(newClass);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getAllClasses = async (req, res) => {
    try {
        const classes = await Class.find().lean();

        // Calculate student count for each class dynamically
        const classesWithCounts = await Promise.all(classes.map(async (cls) => {
            const studentCount = await User.countDocuments({ enrolledClass: cls._id, role: 'student' });
            return { ...cls, studentCount };
        }));

        res.json(classesWithCounts);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, description } = req.body;
        const updatedClass = await Class.findByIdAndUpdate(
            id,
            { name, type, description },
            { new: true }
        );
        if (!updatedClass) {
            return res.status(404).json({ message: 'Class not found' });
        }
        res.json(updatedClass);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.deleteClass = async (req, res) => {
    try {
        const { id } = req.params;
        // Soft delete: set isDeleted to true
        const deletedClass = await Class.findByIdAndUpdate(
            id,
            { isDeleted: true },
            { new: true }
        );
        if (!deletedClass) {
            return res.status(404).json({ message: 'Class not found' });
        }
        res.json({ message: 'Class deleted successfully (Soft Delete)', class: deletedClass });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.restoreClass = async (req, res) => {
    try {
        const { id } = req.params;
        // Restore: set isDeleted to false
        const restoredClass = await Class.findByIdAndUpdate(
            id,
            { isDeleted: false },
            { new: true }
        );
        if (!restoredClass) {
            return res.status(404).json({ message: 'Class not found' });
        }
        res.json({ message: 'Class restored successfully', class: restoredClass });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getClassStudents = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10, search = '' } = req.query;

        const classData = await Class.findById(id);
        if (!classData) {
            return res.status(404).json({ message: 'Class not found' });
        }

        const query = { enrolledClass: id };
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const students = await User.find(query)
            .select('name email enrollment branch')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await User.countDocuments(query);

        res.json({
            students,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalStudents: count,
            className: classData.name
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
