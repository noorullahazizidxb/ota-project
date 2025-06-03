CREATE DEFINER=`root`@`localhost` PROCEDURE `prcSearchUser`(in prmOrgId integer, in prmNam varchar(50))
BEGIN
SELECT userId,
		name,
        family,
        nationalId,
        username,
        buyer as data,
        mobile,
        mobileCode,
        email
		FROM viwUsers 
		where (name like concat(prmNam , '%') 
        or family like concat(prmNam , '%')
		or mobile like concat(prmNam , '%') 
		or email like concat(prmNam , '%'))
		and orgId = prmOrgId;
END