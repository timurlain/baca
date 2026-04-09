using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Baca.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRegistraceUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RegistraceUserId",
                table: "Users",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_RegistraceUserId",
                table: "Users",
                column: "RegistraceUserId",
                unique: true,
                filter: "\"RegistraceUserId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_RegistraceUserId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RegistraceUserId",
                table: "Users");
        }
    }
}
