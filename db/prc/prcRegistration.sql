CREATE DEFINER=`root`@`localhost` PROCEDURE `prcRegistration`(
 in prmOrgId int,
 in prmFromOrgId int,
 in prmName varchar(50), 
 in prmFamily varchar(50),
 in prmTelephone json, 
 in prmBuyerData json, 
 in prmEmail varchar(50),
 in prmPassword varchar(150)
 )
BEGIN
	DECLARE userid INT DEFAULT 0;
	DECLARE organizationUserId INT DEFAULT 0;
	DECLARE duplicateCount INTEGER DEFAULT NULL;
    DECLARE duplicatation integer default 0;
	SELECT count(id) FROM gensec.organizationUser
	where mobile =JSON_EXTRACT(prmTelephone ,'$.PhoneNumber') and orgId = prmOrgId  into duplicateCount;
	IF duplicateCount = 0 THEN
		START TRANSACTION;
			INSERT INTO users ( name, family) VALUES
				(
				prmName,
				prmFamily);
			SELECT LAST_INSERT_ID() INTO userid;
			INSERT INTO organizationUser (orgId, userId, fromOrgId, roleId, sgroupId, levelId,mobileCode,mobile, email, password, status,buyer) VALUES
			(prmOrgId,
			 userid,
			 prmFromOrgId,
			 1,
			 1,
			 1,
			 JSON_UNQUOTE(JSON_EXTRACT(prmTelephone ,'$.CountryAccessCode')),
			 JSON_UNQUOTE(JSON_EXTRACT(prmTelephone ,'$.PhoneNumber')),
			 prmEmail,
			 prmPassword,
			 'enabled',
			 prmBuyerData);
			SELECT LAST_INSERT_ID() INTO organizationUserId;
			IF (userid > 0 AND organizationUserId > 0) THEN
			   COMMIT;
			   SELECT viwUsers.userId,
			   viwUsers.name,
			   viwUsers.family,
			   viwUsers.nationalId,
			   viwUsers.username,
			   viwUsers.buyer as data,
			   viwUsers.mobile,
			   viwUsers.mobileCode,
			   viwUsers.email,
			   duplicatation
			   FROM gensec.viwUsers
			   where orgUserId = organizationUserId
				and orgId = prmOrgId;
			ELSE
				ROLLBACK;
			END IF;
	ELSE
		set duplicatation = 1;
		SELECT viwUsers.userId,
			viwUsers.name,
			viwUsers.family,
			viwUsers.nationalId,
			viwUsers.username,
			viwUsers.buyer as data,
			viwUsers.mobile,
			viwUsers.mobileCode,
			viwUsers.email,
			duplicatation 
		FROM gensec.viwUsers 
		where mobile = JSON_EXTRACT(prmTelephone ,'$.PhoneNumber') 
		and orgId = prmOrgId;
END IF;
END