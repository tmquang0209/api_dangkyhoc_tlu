const mergeClass = (classList) => {
    return classList.map((item) => {
        const classList = item.classList.reduce((acc, curr) => {
            const existingItem = acc.find(
                (item) => item.className === curr.className
            );
            if (existingItem) {
                existingItem._id.push(curr._id);
                existingItem.day.push(curr.day);
                existingItem.shift.push(curr.shift);
                existingItem.classroom.push(curr.classroom);
            } else {
                acc.push({
                    _id: [curr._id],
                    className: curr.className,
                    day: [curr.day],
                    shift: [curr.shift],
                    classroom: [curr.classroom],
                    teacher: curr.teacher,
                });
            }
            return acc;
        }, []);
        return { ...item, classList };
    });
};

module.exports = mergeClass;
