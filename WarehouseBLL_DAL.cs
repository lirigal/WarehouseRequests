using System;
using System.Data;
using Npgsql;
using NpgsqlTypes;
using System.Configuration;

namespace WarehouseRequests.DAL
{
    /// <summary>
    /// Data Access Layer protecting the application from SQL injections using direct parameterized Npgsql ADO.NET execution.
    /// </summary>
    public class AttributeRepository
    {
        private readonly string _connString = ConfigurationManager.ConnectionStrings["WarehouseRequestsDBConnectionString"].ConnectionString;

        public DataTable ExecuteStoredProcedure(string spName, NpgsqlParameter[] parameters = null)
        {
            using (NpgsqlConnection conn = new NpgsqlConnection(_connString))
            using (NpgsqlCommand cmd = new NpgsqlCommand(spName, conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                if (parameters != null)
                {
                    cmd.Parameters.AddRange(parameters);
                }

                using (NpgsqlDataAdapter da = new NpgsqlDataAdapter(cmd))
                {
                    DataTable dt = new DataTable();
                    da.Fill(dt);
                    return dt;
                }
            }
        }

        public int ExecuteNonQuery(string queryText, NpgsqlParameter[] parameters, bool isStoredProc = false)
        {
            using (NpgsqlConnection conn = new NpgsqlConnection(_connString))
            using (NpgsqlCommand cmd = new NpgsqlCommand(queryText, conn))
            {
                cmd.CommandType = isStoredProc ? CommandType.StoredProcedure : CommandType.Text;
                if (parameters != null)
                {
                    cmd.Parameters.AddRange(parameters);
                }

                conn.Open();
                return cmd.ExecuteNonQuery();
            }
        }

        public object ExecuteScalar(string queryText, NpgsqlParameter[] parameters)
        {
            using (NpgsqlConnection conn = new NpgsqlConnection(_connString))
            using (NpgsqlCommand cmd = new NpgsqlCommand(queryText, conn))
            {
                cmd.CommandType = CommandType.Text;
                if (parameters != null)
                {
                    cmd.Parameters.AddRange(parameters);
                }

                conn.Open();
                return cmd.ExecuteScalar();
            }
        }
    }
}

namespace WarehouseRequests.BLL
{
    using WarehouseRequests.DAL;

    public class WarehouseAttributeBLL
    {
        private readonly AttributeRepository _repo = new AttributeRepository();

        public DataTable GetAllAttributeTypes(bool includeDeleted = false)
        {
            string sql = "SELECT * FROM AttributeTypes WHERE IsDeleted = @IsDeleted OR @IncludeDeleted = true ORDER BY TypeNameHe";
            NpgsqlParameter[] gp = {
                new NpgsqlParameter("@IsDeleted", NpgsqlDbType.Boolean) { Value = false },
                new NpgsqlParameter("@IncludeDeleted", NpgsqlDbType.Boolean) { Value = includeDeleted }
            };
            
            using (NpgsqlConnection conn = new NpgsqlConnection(ConfigurationManager.ConnectionStrings["WarehouseRequestsDBConnectionString"].ConnectionString))
            using (NpgsqlCommand cmd = new NpgsqlCommand(sql, conn))
            {
                cmd.Parameters.AddRange(gp);
                NpgsqlDataAdapter da = new NpgsqlDataAdapter(cmd);
                DataTable dt = new DataTable();
                da.Fill(dt);
                return dt;
            }
        }

        public bool IsTypeNameExists(string nameHe, string nameEn)
        {
            string sql = "SELECT COUNT(1) FROM AttributeTypes WHERE (TypeNameHe = @He OR TypeNameEn = @En) AND IsDeleted = false";
            NpgsqlParameter[] gp = {
                new NpgsqlParameter("@He", NpgsqlDbType.Varchar) { Value = nameHe },
                new NpgsqlParameter("@En", NpgsqlDbType.Varchar) { Value = nameEn }
            };
            return Convert.ToInt32(_repo.ExecuteScalar(sql, gp)) > 0;
        }

        public bool InsertAttributeType(string nameHe, string nameEn, string userId)
        {
            string sql = "INSERT INTO AttributeTypes (TypeNameHe, TypeNameEn, CreatedBy) VALUES (@He, @En, @User)";
            NpgsqlParameter[] gp = {
                new NpgsqlParameter("@He", NpgsqlDbType.Varchar) { Value = nameHe },
                new NpgsqlParameter("@En", NpgsqlDbType.Varchar) { Value = nameEn },
                new NpgsqlParameter("@User", NpgsqlDbType.Varchar) { Value = userId }
            };
            return _repo.ExecuteNonQuery(sql, gp) > 0;
        }

        public DataTable GetValuesByTypeId(int typeId, bool includeDeleted = false)
        {
            string sql = "SELECT * FROM AttributeValues WHERE AttributeTypeId = @TypeId AND (IsDeleted = false OR @IncludeDeleted = true) ORDER BY ValueNameHe";
            NpgsqlParameter[] gp = {
                new NpgsqlParameter("@TypeId", NpgsqlDbType.Integer) { Value = typeId },
                new NpgsqlParameter("@IncludeDeleted", NpgsqlDbType.Boolean) { Value = includeDeleted }
            };
            
            using (NpgsqlConnection conn = new NpgsqlConnection(ConfigurationManager.ConnectionStrings["WarehouseRequestsDBConnectionString"].ConnectionString))
            using (NpgsqlCommand cmd = new NpgsqlCommand(sql, conn))
            {
                cmd.Parameters.AddRange(gp);
                NpgsqlDataAdapter da = new NpgsqlDataAdapter(cmd);
                DataTable dt = new DataTable();
                da.Fill(dt);
                return dt;
            }
        }

        public bool IsValueExists(int typeId, string valHe, string valEn)
        {
            string sql = "SELECT COUNT(1) FROM AttributeValues WHERE AttributeTypeId = @TypeId AND (ValueNameHe = @He OR ValueNameEn = @En) AND IsDeleted = false";
            NpgsqlParameter[] gp = {
                new NpgsqlParameter("@TypeId", NpgsqlDbType.Integer) { Value = typeId },
                new NpgsqlParameter("@He", NpgsqlDbType.Varchar) { Value = valHe },
                new NpgsqlParameter("@En", NpgsqlDbType.Varchar) { Value = valEn }
            };
            
            using (NpgsqlConnection conn = new NpgsqlConnection(ConfigurationManager.ConnectionStrings["WarehouseRequestsDBConnectionString"].ConnectionString))
            using (NpgsqlCommand cmd = new NpgsqlCommand(sql, conn))
            {
                cmd.Parameters.AddRange(gp);
                conn.Open();
                return Convert.ToInt32(cmd.ExecuteScalar()) > 0;
            }
        }

        public bool InsertAttributeValue(int typeId, string valHe, string valEn, string userId)
        {
            string sql = "INSERT INTO AttributeValues (AttributeTypeId, ValueNameHe, ValueNameEn, CreatedBy) VALUES (@TypeId, @He, @En, @User)";
            NpgsqlParameter[] gp = {
                new NpgsqlParameter("@TypeId", NpgsqlDbType.Integer) { Value = typeId },
                new NpgsqlParameter("@He", NpgsqlDbType.Varchar) { Value = valHe },
                new NpgsqlParameter("@En", NpgsqlDbType.Varchar) { Value = valEn },
                new NpgsqlParameter("@User", NpgsqlDbType.Varchar) { Value = userId }
            };
            using (NpgsqlConnection conn = new NpgsqlConnection(ConfigurationManager.ConnectionStrings["WarehouseRequestsDBConnectionString"].ConnectionString))
            using (NpgsqlCommand cmd = new NpgsqlCommand(sql, conn))
            {
                cmd.Parameters.AddRange(gp);
                conn.Open();
                return cmd.ExecuteNonQuery() > 0;
            }
        }

        public void SoftDeleteAttributeType(int typeId, string userId)
        {
            string sql = "UPDATE AttributeTypes SET IsDeleted = true WHERE AttributeTypeId = @TypeId; UPDATE AttributeValues SET IsDeleted = true WHERE AttributeTypeId = @TypeId;";
            NpgsqlParameter[] gp = { new NpgsqlParameter("@TypeId", NpgsqlDbType.Integer) { Value = typeId } };
            using (NpgsqlConnection conn = new NpgsqlConnection(ConfigurationManager.ConnectionStrings["WarehouseRequestsDBConnectionString"].ConnectionString))
            using (NpgsqlCommand cmd = new NpgsqlCommand(sql, conn))
            {
                cmd.Parameters.AddRange(gp);
                conn.Open();
                cmd.ExecuteNonQuery();
            }
        }

        public void SoftDeleteAttributeValue(int valId, string userId)
        {
            string sql = "UPDATE AttributeValues SET IsDeleted = true WHERE AttributeValueId = @ValId";
            NpgsqlParameter[] gp = { new NpgsqlParameter("@ValId", NpgsqlDbType.Integer) { Value = valId } };
            using (NpgsqlConnection conn = new NpgsqlConnection(ConfigurationManager.ConnectionStrings["WarehouseRequestsDBConnectionString"].ConnectionString))
            using (NpgsqlCommand cmd = new NpgsqlCommand(sql, conn))
            {
                cmd.Parameters.AddRange(gp);
                conn.Open();
                cmd.ExecuteNonQuery();
            }
        }

        public void ToggleTypeActiveStatus(int typeId, string userId)
        {
            string sql = "UPDATE AttributeTypes SET IsActive = NOT IsActive WHERE AttributeTypeId = @TypeId";
            NpgsqlParameter[] gp = { new NpgsqlParameter("@TypeId", NpgsqlDbType.Integer) { Value = typeId } };
            using (NpgsqlConnection conn = new NpgsqlConnection(ConfigurationManager.ConnectionStrings["WarehouseRequestsDBConnectionString"].ConnectionString))
            using (NpgsqlCommand cmd = new NpgsqlCommand(sql, conn))
            {
                cmd.Parameters.AddRange(gp);
                conn.Open();
                cmd.ExecuteNonQuery();
            }
        }

        public void ToggleValueActiveStatus(int valId, string userId)
        {
            string sql = "UPDATE AttributeValues SET IsActive = NOT IsActive WHERE AttributeValueId = @ValId";
            NpgsqlParameter[] gp = { new NpgsqlParameter("@ValId", NpgsqlDbType.Integer) { Value = valId } };
            using (NpgsqlConnection conn = new NpgsqlConnection(ConfigurationManager.ConnectionStrings["WarehouseRequestsDBConnectionString"].ConnectionString))
            using (NpgsqlCommand cmd = new NpgsqlCommand(sql, conn))
            {
                cmd.Parameters.AddRange(gp);
                conn.Open();
                cmd.ExecuteNonQuery();
            }
        }
    }
}
