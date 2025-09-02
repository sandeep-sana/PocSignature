const COMMON = {
    REQUIRED : 'is required',
    MAX_50: '50 charaacters',
    MAX_100: '100 charaacters',
    
}
const VEE_VALIDATION_MESSAGE = {
    EMPLOYEE_ID_REQUIRED: `EmployeeId ${COMMON.REQUIRED}`,
    NAME_REQUIRED:  `Name ${COMMON.REQUIRED}`,
    EMAIL_REQUIRED:  `Email ${COMMON.REQUIRED}`,
    DEPT_REQUIRED:  `Dept ${COMMON.REQUIRED}`,
    CONSENT_REQUIRED:  `Consent ${COMMON.REQUIRED}`,
    
    EMPLOYEE_ID_MAX_50: `EmployeeId can exceed ${COMMON.MAX_50}`,
    NAME_MAX_50: `Name can exceed ${COMMON.MAX_50}`,
    EMAIL_MAX_100: `Email can exceed ${COMMON.MAX_50}`,


    EMAIL_INVALID: `Email is not valid`,

}
 
export default VEE_VALIDATION_MESSAGE;