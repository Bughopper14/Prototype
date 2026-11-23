import pymysql

conn = pymysql.connect(
    host='127.0.0.1',
    port=3306,
    user='root',
    password='123987',
    database='crm_liugong',
    charset='utf8mb4',
    autocommit=True
)

with conn.cursor() as cur:
    print("Checking crm_fap_legal_deed_reviews...")
    cur.execute("SHOW COLUMNS FROM crm_fap_legal_deed_reviews LIKE 'review_status'")
    col = cur.fetchone()
    print("Current review_status column:", col)

    # Apply 6-alter-deed-review-status.sql
    print("Applying 6-alter-deed-review-status.sql...")
    cur.execute("""
        ALTER TABLE `crm_fap_legal_deed_reviews`
          MODIFY COLUMN `review_status` enum('PENDING','APPROVED','NEEDS_REVISION','REJECTED')
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING'
    """)
    cur.execute("UPDATE `crm_fap_legal_deed_reviews` SET `review_status` = 'REJECTED' WHERE `review_status` = 'NEEDS_REVISION'")
    cur.execute("""
        ALTER TABLE `crm_fap_legal_deed_reviews`
          MODIFY COLUMN `review_status` enum('PENDING','APPROVED','REJECTED')
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING'
    """)
    cur.execute("UPDATE `crm_frozen_fap_legal_deeds` SET `review_status` = 'REJECTED' WHERE `review_status` = 'NEEDS_REVISION'")

    cur.execute("SHOW COLUMNS FROM crm_fap_legal_deed_reviews LIKE 'review_status'")
    print("Updated review_status column:", cur.fetchone())

    # Check crm_application_approval_decisions
    cur.execute("SHOW TABLES LIKE 'crm_application_approval_decisions'")
    tbl = cur.fetchone()
    print("crm_application_approval_decisions exists?", tbl)

    # Check crm_application_approval_steps columns
    cur.execute("SHOW COLUMNS FROM crm_application_approval_steps LIKE 'remarks'")
    print("crm_application_approval_steps remarks column:", cur.fetchone())

conn.close()
print("Migration check complete.")
